import { Prisma, SubscriptionStatus, BillingFrequency, QuotationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateSubscriptionDto,
  ConvertQuotationToSubscriptionDto,
  UpdateSubscriptionStatusDto,
  SubscriptionQueryFilters,
} from './subscriptions.types';
import { AuthUser } from '../../types';
import { buildPagination, formatPaginatedResponse } from '../../utils/pagination';
import { FinancialCalculator } from '../../utils/calculation';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class SubscriptionService {
  /**
   * Generate sequential subscription number: SUB-YYYY-XXXXX
   */
  private async generateSubscriptionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SUB-${year}-`;

    const latest = await prisma.subscription.findFirst({
      where: { subscriptionNumber: { startsWith: prefix } },
      orderBy: { subscriptionNumber: 'desc' },
      select: { subscriptionNumber: true },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.subscriptionNumber.split('-');
      if (parts.length === 3) {
        seq = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(5, '0')}`;
  }

  /**
   * Calculate next billing date based on plan frequency and interval count
   */
  calculateNextBillingDate(startDate: Date, frequency: BillingFrequency, intervalCount = 1): Date {
    const nextDate = new Date(startDate.getTime());

    switch (frequency) {
      case BillingFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1 * intervalCount);
        break;
      case BillingFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7 * intervalCount);
        break;
      case BillingFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1 * intervalCount);
        break;
      case BillingFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1 * intervalCount);
        break;
    }

    return nextDate;
  }

  /**
   * Create a new subscription directly
   */
  async createSubscription(user: AuthUser, dto: CreateSubscriptionDto) {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Active subscription plan not found');
    }

    // Process lines and snapshots
    let subtotalAcc = 0;
    let taxAcc = 0;
    let discountAcc = 0;
    const lineCalculations = [];

    for (const line of dto.lines) {
      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        include: { taxRules: { include: { taxRule: true } } },
      });
      if (!product) {
        throw new NotFoundError(`Product ${line.productId} not found`);
      }

      let variantSurcharge = 0;
      if (line.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: line.variantId, productId: line.productId },
        });
        if (!variant) {
          throw new NotFoundError(`Variant ${line.variantId} not found`);
        }
        variantSurcharge = Number(variant.additionalPrice);
      }

      const unitPrice =
        line.unitPrice !== undefined
          ? Number(line.unitPrice)
          : Number(product.salesPrice) + variantSurcharge;

      const discountAmount = Number(line.discountAmount || 0);

      let taxRate = 0;
      let taxRuleId = line.taxRuleId || null;
      if (taxRuleId) {
        const tr = await prisma.taxRule.findUnique({ where: { id: taxRuleId } });
        if (tr) taxRate = Number(tr.rate);
      } else if (product.taxRules.length > 0) {
        const def = product.taxRules.find((r) => r.taxRule.isDefault) || product.taxRules[0];
        taxRate = Number(def.taxRule.rate);
        taxRuleId = def.taxRuleId;
      }

      const calc = FinancialCalculator.calculateLine({
        unitPrice,
        quantity: line.quantity,
        discountAmount,
        taxRatePercent: taxRate,
      });

      subtotalAcc += unitPrice * line.quantity;
      discountAcc += discountAmount;
      taxAcc += Number(calc.taxAmount);

      lineCalculations.push({
        productId: line.productId,
        variantId: line.variantId || null,
        taxRuleId,
        quantity: line.quantity,
        unitPrice: calc.unitPrice,
        discountAmount: calc.discountAmount,
        taxRate: calc.taxRate,
        taxAmount: calc.taxAmount,
        lineTotal: calc.lineTotal,
      });
    }

    const totalAmount = subtotalAcc - discountAcc + taxAcc;
    const subscriptionNumber = await this.generateSubscriptionNumber();
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const nextBillingDate = this.calculateNextBillingDate(startDate, plan.billingFrequency, plan.intervalCount);

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId: dto.customerId,
        planId: dto.planId,
        quotationId: dto.quotationId || null,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        nextBillingDate,
        currency: dto.currency || 'USD',
        paymentTerms: dto.paymentTerms || 'Net 30',
        subtotal: FinancialCalculator.toDecimal(subtotalAcc),
        discountAmount: FinancialCalculator.toDecimal(discountAcc),
        taxAmount: FinancialCalculator.toDecimal(taxAcc),
        totalAmount: FinancialCalculator.toDecimal(totalAmount),
        lines: {
          create: lineCalculations,
        },
        ...(dto.discountRuleIds && dto.discountRuleIds.length > 0
          ? {
              discounts: {
                create: dto.discountRuleIds.map((discountRuleId) => ({ discountRuleId })),
              },
            }
          : {}),
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: SubscriptionStatus.ACTIVE,
            changedById: user.id,
            reason: 'Direct subscription creation',
          },
        },
      },
      include: {
        lines: {
          include: { product: true, variant: true },
        },
        plan: true,
        customer: true,
        discounts: { include: { discountRule: true } },
      },
    });

    logger.info(`[Subscriptions] Created subscription ${subscription.subscriptionNumber}`);
    return subscription;
  }

  /**
   * Convert an Accepted Quotation into an Active Subscription atomically
   */
  async convertQuotationToSubscription(user: AuthUser, dto: ConvertQuotationToSubscriptionDto) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: dto.quotationId },
      include: {
        lines: true,
        plan: true,
        subscription: true,
      },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    if (quotation.subscription) {
      throw new ConflictError(
        `Quotation is already linked to subscription ${quotation.subscription.subscriptionNumber}`
      );
    }

    if (quotation.status !== QuotationStatus.ACCEPTED) {
      throw new ValidationError(
        `Quotation must be in ACCEPTED status before conversion (current: ${quotation.status})`
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const nextBillingDate = this.calculateNextBillingDate(
      startDate,
      quotation.plan.billingFrequency,
      quotation.plan.intervalCount
    );

    const subscriptionNumber = await this.generateSubscriptionNumber();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Subscription
      const newSub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          planId: quotation.planId,
          quotationId: quotation.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          nextBillingDate,
          currency: quotation.currency,
          paymentTerms: dto.paymentTerms || 'Net 30',
          subtotal: quotation.subtotal,
          discountAmount: quotation.discountAmount,
          taxAmount: quotation.taxAmount,
          totalAmount: quotation.totalAmount,
          lines: {
            create: quotation.lines.map((ql) => ({
              productId: ql.productId,
              variantId: ql.variantId,
              taxRuleId: ql.taxRuleId,
              quantity: ql.quantity,
              unitPrice: ql.unitPrice,
              discountAmount: ql.discountAmount,
              taxRate: ql.taxRate,
              taxAmount: ql.taxAmount,
              lineTotal: ql.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              fromStatus: SubscriptionStatus.QUOTATION,
              toStatus: SubscriptionStatus.ACTIVE,
              changedById: user.id,
              reason: `Converted from quotation ${quotation.quotationNumber}`,
            },
          },
        },
        include: {
          lines: { include: { product: true } },
          plan: true,
          customer: true,
        },
      });

      // 2. Mark quotation as CONVERTED
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: QuotationStatus.CONVERTED },
      });

      return newSub;
    });

    logger.info(`[Subscriptions] Converted quotation ${quotation.quotationNumber} into subscription ${result.subscriptionNumber}`);
    return result;
  }

  /**
   * List subscriptions with customer scoping
   */
  async listSubscriptions(user: AuthUser, filters: SubscriptionQueryFilters) {
    const { page, limit, skip, take } = buildPagination(filters);

    const where: Prisma.SubscriptionWhereInput = {};

    if (user.role === 'CUSTOMER') {
      if (!user.customerProfileId) {
        throw new ForbiddenError('No customer profile associated with user');
      }
      where.customerId = user.customerProfileId;
    } else if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dueForBilling) {
      where.status = SubscriptionStatus.ACTIVE;
      where.nextBillingDate = { lte: new Date() };
    }

    if (filters.search) {
      where.OR = [
        { subscriptionNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { companyName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { contactName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          customer: { select: { id: true, companyName: true, contactName: true, user: { select: { email: true } } } },
          plan: { select: { id: true, name: true, billingFrequency: true, intervalCount: true } },
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
          _count: { select: { lines: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.subscription.count({ where }),
    ]);

    return formatPaginatedResponse(items, total, page, limit);
  }

  /**
   * Get subscription details
   */
  async getSubscriptionById(user: AuthUser, id: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: { product: true, variant: true, taxRule: true },
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            issueDate: true,
            dueDate: true,
            grandTotal: true,
            paidAmount: true,
            balanceDue: true,
          },
        },
        discounts: { include: { discountRule: true } },
        statusHistory: {
          include: { changedBy: { select: { id: true, email: true } } },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (user.role === 'CUSTOMER' && subscription.customerId !== user.customerProfileId) {
      throw new ForbiddenError('Access forbidden: You cannot view another customer subscription');
    }

    return subscription;
  }

  /**
   * Update subscription status (PAUSE, RESUME, CLOSE)
   */
  async updateSubscriptionStatus(
    user: AuthUser,
    id: string,
    dto: UpdateSubscriptionStatusDto
  ) {
    const subscription = await this.getSubscriptionById(user, id);

    // Business rule validations
    if (dto.status === SubscriptionStatus.PAUSED && !subscription.plan.allowPause) {
      throw new ValidationError(`Plan '${subscription.plan.name}' does not permit pausing`);
    }

    if (dto.status === SubscriptionStatus.CLOSED && !subscription.plan.allowEarlyClose) {
      throw new ValidationError(`Plan '${subscription.plan.name}' does not permit early closure`);
    }

    const now = new Date();
    const data: Prisma.SubscriptionUpdateInput = {
      status: dto.status,
    };

    if (dto.status === SubscriptionStatus.PAUSED) {
      data.pausedAt = now;
    } else if (dto.status === SubscriptionStatus.ACTIVE && subscription.status === SubscriptionStatus.PAUSED) {
      data.pausedAt = null;
    } else if (dto.status === SubscriptionStatus.CLOSED) {
      data.closedAt = now;
      data.closureReason = dto.reason || 'Closed by user request';
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data,
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: id,
          fromStatus: subscription.status,
          toStatus: dto.status,
          changedById: user.id,
          reason: dto.reason || `Status updated to ${dto.status}`,
        },
      });

      return sub;
    });

    logger.info(`[Subscriptions] Subscription ${subscription.subscriptionNumber} status updated to ${dto.status}`);
    return updated;
  }

  /**
   * Blueprint Dedicated Lifecycle Endpoints
   */
  async activateSubscription(user: AuthUser, id: string) {
    return this.updateSubscriptionStatus(user, id, {
      status: SubscriptionStatus.ACTIVE,
      reason: 'Activated agreement',
    });
  }

  async pauseSubscription(user: AuthUser, id: string, reason?: string) {
    return this.updateSubscriptionStatus(user, id, {
      status: SubscriptionStatus.PAUSED,
      reason: reason || 'Paused agreement',
    });
  }

  async resumeSubscription(user: AuthUser, id: string) {
    return this.updateSubscriptionStatus(user, id, {
      status: SubscriptionStatus.ACTIVE,
      reason: 'Resumed agreement from paused state',
    });
  }

  async closeSubscription(user: AuthUser, id: string, reason?: string) {
    return this.updateSubscriptionStatus(user, id, {
      status: SubscriptionStatus.CLOSED,
      reason: reason || 'Closed / cancelled agreement',
    });
  }

  /**
   * Manual or automated renewal
   */
  async renewSubscription(user: AuthUser, id: string) {
    const subscription = await this.getSubscriptionById(user, id);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new ValidationError('Only ACTIVE subscriptions can be renewed');
    }

    if (!subscription.plan.allowRenewal) {
      throw new ValidationError(`Plan '${subscription.plan.name}' does not permit renewal`);
    }

    const currentNext = new Date(subscription.nextBillingDate);
    const advancedBillingDate = this.calculateNextBillingDate(
      currentNext,
      subscription.plan.billingFrequency,
      subscription.plan.intervalCount
    );

    const renewed = await prisma.subscription.update({
      where: { id },
      data: {
        renewalCount: { increment: 1 },
        lastRenewedAt: new Date(),
        nextBillingDate: advancedBillingDate,
      },
    });

    logger.info(
      `[Subscriptions] Subscription ${subscription.subscriptionNumber} renewed (Count: ${renewed.renewalCount}, Next Billing: ${advancedBillingDate.toISOString()})`
    );
    return renewed;
  }
}

export const subscriptionService = new SubscriptionService();
