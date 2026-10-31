import { Prisma, InvoiceStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { InvoiceFilters, UpdateInvoiceStatusDto } from './billing.types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class InvoicesService {
  /**
   * List invoices with role-based scoping and multi-attribute filters
   */
  async listInvoices(
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null },
    filters?: InvoiceFilters
  ) {
    const where: Prisma.InvoiceWhereInput = {};

    // Customer scoping: Customer only ever sees their own invoices
    if (currentUser.role === UserRole.CUSTOMER) {
      if (!currentUser.customerProfileId) {
        throw new ForbiddenError('Customer profile not found for authenticated user');
      }
      where.customerId = currentUser.customerProfileId;
    } else if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.subscriptionId) {
      where.subscriptionId = filters.subscriptionId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isOverdue) {
      where.status = { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] };
      where.dueDate = { lt: new Date() };
    }

    if (filters?.search && filters.search.trim()) {
      where.invoiceNumber = {
        contains: filters.search.trim(),
        mode: 'insensitive',
      };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        lines: true,
        _count: {
          select: {
            allocations: true,
          },
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    return invoices.map((inv) => this.formatInvoice(inv));
  }

  /**
   * Get single invoice details by ID
   */
  async getInvoiceById(
    id: string,
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null }
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
        billingCycleLog: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice '${id}' not found`);
    }

    if (
      currentUser.role === UserRole.CUSTOMER &&
      invoice.customerId !== currentUser.customerProfileId
    ) {
      throw new ForbiddenError("You cannot view another customer's invoice");
    }

    return this.formatInvoice(invoice);
  }

  /**
   * Update invoice status (e.g. DRAFT -> CONFIRMED, CANCELLED)
   */
  async updateInvoiceStatus(
    id: string,
    dto: UpdateInvoiceStatusDto
  ) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError(`Invoice '${id}' not found`);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationError('Paid invoices cannot be altered or cancelled');
    }

    const updateData: Prisma.InvoiceUpdateInput = {
      status: dto.status,
    };

    if (dto.status === InvoiceStatus.CONFIRMED && !invoice.confirmedAt) {
      updateData.confirmedAt = new Date();
    } else if (dto.status === InvoiceStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      if (dto.notes) updateData.notes = dto.notes;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { customer: true, lines: true },
    });

    logger.info(`[InvoicesService] Invoice ${updated.invoiceNumber} status: ${invoice.status} -> ${dto.status}`);
    return this.formatInvoice(updated);
  }

  /**
   * Get aggregated billing and invoice statistics
   */
  async getBillingStats(
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null }
  ) {
    const where: Prisma.InvoiceWhereInput = {};
    if (currentUser.role === UserRole.CUSTOMER) {
      where.customerId = currentUser.customerProfileId || '';
    }

    const [allInvoices, overdueInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where,
        select: {
          status: true,
          grandTotal: true,
          paidAmount: true,
          balanceDue: true,
        },
      }),
      prisma.invoice.count({
        where: {
          ...where,
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    let totalInvoicedCents = 0;
    let totalPaidCents = 0;
    let totalBalanceDueCents = 0;
    let draftCount = 0;
    let confirmedCount = 0;
    let paidCount = 0;

    for (const inv of allInvoices) {
      if (inv.status !== InvoiceStatus.CANCELLED) {
        totalInvoicedCents += Math.round(Number(inv.grandTotal) * 100);
        totalPaidCents += Math.round(Number(inv.paidAmount) * 100);
        totalBalanceDueCents += Math.round(Number(inv.balanceDue) * 100);
      }

      if (inv.status === InvoiceStatus.DRAFT) draftCount++;
      else if (inv.status === InvoiceStatus.CONFIRMED) confirmedCount++;
      else if (inv.status === InvoiceStatus.PAID) paidCount++;
    }

    return {
      totalInvoices: allInvoices.length,
      totalInvoiced: Number((totalInvoicedCents / 100).toFixed(2)),
      totalPaid: Number((totalPaidCents / 100).toFixed(2)),
      totalBalanceDue: Number((totalBalanceDueCents / 100).toFixed(2)),
      overdueCount: overdueInvoices,
      statusBreakdown: {
        draft: draftCount,
        confirmed: confirmedCount,
        paid: paidCount,
      },
    };
  }

  /**
   * Retrieve recurring billing cycle execution logs for audit and retry inspection
   */
  async listBillingLogs(filters?: { subscriptionId?: string }) {
    const where: Prisma.BillingCycleLogWhereInput = {};
    if (filters?.subscriptionId) {
      where.subscriptionId = filters.subscriptionId;
    }

    const logs = await prisma.billingCycleLog.findMany({
      where,
      include: {
        subscription: {
          include: {
            customer: true,
            plan: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            status: true,
          },
        },
      },
      orderBy: { processedAt: 'desc' },
      take: 100,
    });

    return logs.map((log) => ({
      ...log,
      invoice: log.invoice
        ? {
            ...log.invoice,
            grandTotal: Number(log.invoice.grandTotal),
          }
        : null,
    }));
  }

  /**
   * Format Decimal types to clean numbers
   */
  private formatInvoice(inv: any) {
    const isOverdue =
      inv.status !== InvoiceStatus.PAID &&
      inv.status !== InvoiceStatus.CANCELLED &&
      new Date(inv.dueDate) < new Date();

    return {
      ...inv,
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      grandTotal: Number(inv.grandTotal),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.balanceDue),
      isOverdue,
      lines: inv.lines
        ? inv.lines.map((l: any) => ({
            ...l,
            unitPrice: Number(l.unitPrice),
            discountAmount: Number(l.discountAmount),
            taxRate: Number(l.taxRate),
            taxAmount: Number(l.taxAmount),
            lineTotal: Number(l.lineTotal),
          }))
        : undefined,
    };
  }
}

export const invoicesService = new InvoicesService();
