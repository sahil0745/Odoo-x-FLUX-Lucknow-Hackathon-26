import { Prisma, InvoiceStatus, BillingRunStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateManualInvoiceDto,
  InvoiceQueryFilters,
} from './invoices.types';
import { AuthUser } from '../../types';
import { subscriptionService } from '../subscriptions/subscriptions.service';
import { buildPagination, formatPaginatedResponse } from '../../utils/pagination';
import { FinancialCalculator } from '../../utils/calculation';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class InvoiceService {
  /**
   * Generate sequential invoice number: INV-YYYY-XXXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.invoiceNumber.split('-');
      if (parts.length === 3) {
        seq = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(5, '0')}`;
  }

  /**
   * Idempotent Recurring Invoice Generator for a Subscription Billing Period
   */
  async generateSubscriptionInvoice(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        lines: {
          include: {
            product: true,
            variant: true,
            taxRule: true,
          },
        },
        plan: true,
        customer: true,
        discounts: {
          where: { isActive: true },
          include: { discountRule: true },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new ValidationError(`Cannot bill subscription in status: ${subscription.status}`);
    }

    const billingPeriodStart = new Date(subscription.nextBillingDate);
    const billingPeriodEnd = subscriptionService.calculateNextBillingDate(
      billingPeriodStart,
      subscription.plan.billingFrequency,
      subscription.plan.intervalCount
    );

    // 1. Strict deduplication check via BillingCycleLog
    const existingCycle = await prisma.billingCycleLog.findUnique({
      where: {
        subscriptionId_billingPeriodStart: {
          subscriptionId,
          billingPeriodStart,
        },
      },
    });

    if (existingCycle && existingCycle.status === BillingRunStatus.GENERATED && existingCycle.invoiceId) {
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id: existingCycle.invoiceId },
        include: { lines: true },
      });
      if (existingInvoice) {
        logger.warn(
          `[Invoices] Duplicate billing prevented: Invoice ${existingInvoice.invoiceNumber} already exists for cycle ${billingPeriodStart.toISOString()}`
        );
        return existingInvoice;
      }
    }

    // 2. Prepare line items and calculate totals
    let subtotalAcc = 0;
    let taxAcc = 0;
    let discountAcc = 0;

    const invoiceLinesData = subscription.lines.map((sl) => {
      const description = sl.variant
        ? `${sl.product.name} - ${sl.variant.variantType}: ${sl.variant.variantValue}`
        : sl.product.name;

      subtotalAcc += Number(sl.unitPrice) * sl.quantity;
      discountAcc += Number(sl.discountAmount);
      taxAcc += Number(sl.taxAmount);

      return {
        productId: sl.productId,
        variantId: sl.variantId,
        taxRuleId: sl.taxRuleId,
        description,
        quantity: sl.quantity,
        unitPrice: sl.unitPrice,
        discountAmount: sl.discountAmount,
        taxRate: sl.taxRate,
        taxAmount: sl.taxAmount,
        lineTotal: sl.lineTotal,
      };
    });

    // Calculate subscription-level discounts scheduled onto the subscription
    for (const subDiscount of subscription.discounts) {
      const rule = subDiscount.discountRule;
      if (rule.isActive && new Date() >= rule.startDate && new Date() <= rule.endDate) {
        let deduction = 0;
        if (rule.discountType === 'PERCENTAGE') {
          deduction = (subtotalAcc * Number(rule.value)) / 100;
        } else {
          deduction = Math.min(subtotalAcc, Number(rule.value));
        }
        discountAcc += deduction;
      }
    }

    const grandTotal = Math.max(0, subtotalAcc - discountAcc + taxAcc);
    const invoiceNumber = await this.generateInvoiceNumber();

    // Default due date: Net 30 from issue date
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 3. Atomically create Invoice, BillingCycleLog, and advance Subscription nextBillingDate
    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          status: InvoiceStatus.CONFIRMED,
          issueDate,
          dueDate,
          billingPeriodStart,
          billingPeriodEnd,
          currency: subscription.currency,
          subtotal: FinancialCalculator.toDecimal(subtotalAcc),
          discountAmount: FinancialCalculator.toDecimal(discountAcc),
          taxAmount: FinancialCalculator.toDecimal(taxAcc),
          grandTotal: FinancialCalculator.toDecimal(grandTotal),
          paidAmount: new Prisma.Decimal('0.00'),
          balanceDue: FinancialCalculator.toDecimal(grandTotal),
          notes: `Auto-generated recurring invoice for ${subscription.subscriptionNumber}`,
          confirmedAt: issueDate,
          lines: {
            create: invoiceLinesData,
          },
        },
        include: {
          lines: true,
          customer: true,
          subscription: true,
        },
      });

      // Upsert billing cycle log
      await tx.billingCycleLog.upsert({
        where: {
          subscriptionId_billingPeriodStart: {
            subscriptionId,
            billingPeriodStart,
          },
        },
        create: {
          subscriptionId,
          billingPeriodStart,
          billingPeriodEnd,
          invoiceId: createdInvoice.id,
          status: BillingRunStatus.GENERATED,
          processedAt: issueDate,
        },
        update: {
          invoiceId: createdInvoice.id,
          status: BillingRunStatus.GENERATED,
          errorMessage: null,
          processedAt: issueDate,
        },
      });

      // Advance subscription's next billing date
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          lastBilledDate: issueDate,
          nextBillingDate: billingPeriodEnd,
        },
      });

      return createdInvoice;
    });

    logger.info(
      `[Invoices] Generated recurring invoice ${invoice.invoiceNumber} for subscription ${subscription.subscriptionNumber} ($${invoice.grandTotal})`
    );
    return invoice;
  }

  /**
   * Process all recurring billing cycles currently due
   */
  async processDueRecurringBilling() {
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: new Date() },
      },
      select: { id: true, subscriptionNumber: true },
    });

    const results = {
      totalDue: dueSubscriptions.length,
      processed: 0,
      failed: 0,
      errors: [] as Array<{ subscriptionId: string; error: string }>,
    };

    for (const sub of dueSubscriptions) {
      try {
        await this.generateSubscriptionInvoice(sub.id);
        results.processed++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          subscriptionId: sub.id,
          error: err.message || 'Unknown billing error',
        });
        logger.error(`[Invoices] Recurring billing failed for ${sub.subscriptionNumber}: ${err.message}`);
      }
    }

    logger.info(`[Invoices] Recurring billing run completed: ${results.processed}/${results.totalDue} processed`);
    return results;
  }

  /**
   * Create a manual invoice for a subscription
   */
  async createManualInvoice(dto: CreateManualInvoiceDto) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { lines: true, customer: true },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const issueDate = new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        status: InvoiceStatus.DRAFT,
        issueDate,
        dueDate,
        billingPeriodStart: new Date(dto.billingPeriodStart),
        billingPeriodEnd: new Date(dto.billingPeriodEnd),
        currency: subscription.currency,
        subtotal: subscription.subtotal,
        discountAmount: subscription.discountAmount,
        taxAmount: subscription.taxAmount,
        grandTotal: subscription.totalAmount,
        paidAmount: new Prisma.Decimal('0.00'),
        balanceDue: subscription.totalAmount,
        notes: dto.notes?.trim() || null,
        lines: {
          create: subscription.lines.map((sl) => ({
            productId: sl.productId,
            variantId: sl.variantId,
            taxRuleId: sl.taxRuleId,
            description: `Manual billing line - ${sl.productId}`,
            quantity: sl.quantity,
            unitPrice: sl.unitPrice,
            discountAmount: sl.discountAmount,
            taxRate: sl.taxRate,
            taxAmount: sl.taxAmount,
            lineTotal: sl.lineTotal,
          })),
        },
      },
      include: { lines: true, customer: true },
    });

    return invoice;
  }

  /**
   * List invoices with customer scoping and filtering
   */
  async listInvoices(user: AuthUser, filters: InvoiceQueryFilters) {
    const { page, limit, skip, take } = buildPagination(filters);

    const where: Prisma.InvoiceWhereInput = {};

    if (user.role === 'CUSTOMER') {
      if (!user.customerProfileId) {
        throw new ForbiddenError('No customer profile associated with user');
      }
      where.customerId = user.customerProfileId;
    } else if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.subscriptionId) {
      where.subscriptionId = filters.subscriptionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.overdueOnly) {
      where.status = { not: InvoiceStatus.PAID };
      where.balanceDue = { gt: new Prisma.Decimal('0.00') };
      where.dueDate = { lt: new Date() };
    }

    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { companyName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { contactName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, companyName: true, contactName: true, user: { select: { email: true } } } },
          subscription: { select: { id: true, subscriptionNumber: true } },
          lines: true,
          _count: { select: { lines: true, allocations: true } },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ]);

    return formatPaginatedResponse(items, total, page, limit);
  }

  /**
   * Get single invoice with full details
   */
  async getInvoiceById(user: AuthUser, id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: { plan: true },
        },
        lines: {
          include: { product: true, variant: true, taxRule: true },
        },
        allocations: {
          include: {
            payment: {
              select: {
                id: true,
                paymentReference: true,
                paymentMethod: true,
                paymentDate: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (user.role === 'CUSTOMER' && invoice.customerId !== user.customerProfileId) {
      throw new ForbiddenError('Access forbidden: You cannot view invoices belonging to another customer');
    }

    return invoice;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id: string, newStatus: InvoiceStatus, notes?: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationError('Paid invoices cannot have their status changed');
    }

    const data: Prisma.InvoiceUpdateInput = { status: newStatus };
    if (newStatus === InvoiceStatus.CONFIRMED && !invoice.confirmedAt) {
      data.confirmedAt = new Date();
    } else if (newStatus === InvoiceStatus.CANCELLED) {
      data.cancelledAt = new Date();
      if (notes) data.notes = notes;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data,
    });

    return updated;
  }

  /**
   * Dedicated Blueprint Actions
   */
  async confirmInvoice(id: string) {
    return this.updateInvoiceStatus(id, InvoiceStatus.CONFIRMED);
  }

  async cancelInvoice(id: string, reason?: string) {
    return this.updateInvoiceStatus(id, InvoiceStatus.CANCELLED, reason);
  }

  async getInvoicePdfData(user: AuthUser, id: string) {
    const invoice = await this.getInvoiceById(user, id);
    return {
      invoice,
      organization: {
        name: 'Brightloop Technologies Inc.',
        address: '100 Innovation Way, Suite 400',
        city: 'San Francisco, CA 94105',
        taxId: 'US-94-3829104',
        email: 'billing@brightloop.io',
      },
      renderedAt: new Date().toISOString(),
    };
  }
}

export const invoiceService = new InvoiceService();
