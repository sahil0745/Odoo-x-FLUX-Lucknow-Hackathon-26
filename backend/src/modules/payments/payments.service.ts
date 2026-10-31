import { Prisma, PaymentMethod, UserRole, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreatePaymentDto, PaymentFilters, PaymentSummaryStats } from './payments.types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class PaymentsService {
  /**
   * Generate sequential payment reference (e.g. PAY-202611-00001)
   */
  private async generatePaymentReference(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `PAY-${yearMonth}-`;

    const latest = await prisma.payment.findFirst({
      where: {
        paymentReference: {
          startsWith: prefix,
        },
      },
      orderBy: {
        paymentReference: 'desc',
      },
      select: {
        paymentReference: true,
      },
    });

    let nextSequence = 1;
    if (latest && latest.paymentReference) {
      const parts = latest.paymentReference.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSequence).padStart(5, '0')}`;
  }

  /**
   * Record a new payment and allocate to customer invoices atomically
   */
  async recordPayment(
    dto: CreatePaymentDto,
    recordedById: string
  ) {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }

    const allocations = dto.allocations || [];

    // Execute atomic payment recording and invoice balance adjustments in a database transaction
    const payment = await prisma.$transaction(async (tx) => {
      // Validate targeted invoices if allocations specified
      if (allocations.length > 0) {
        const invoiceIds = allocations.map((a) => a.invoiceId);
        const targetedInvoices = await tx.invoice.findMany({
          where: { id: { in: invoiceIds } },
        });

        if (targetedInvoices.length !== invoiceIds.length) {
          throw new NotFoundError('One or more targeted invoices were not found');
        }

        for (const alloc of allocations) {
          const inv = targetedInvoices.find((i) => i.id === alloc.invoiceId);
          if (!inv) continue;

          if (inv.customerId !== dto.customerId) {
            throw new ValidationError(
              `Invoice ${inv.invoiceNumber} does not belong to customer ${customer.contactName}`
            );
          }

          if (inv.status === InvoiceStatus.CANCELLED) {
            throw new ValidationError(
              `Cannot allocate payments to cancelled invoice ${inv.invoiceNumber}`
            );
          }

          const currentBalance = inv.balanceDue.toNumber();
          if (currentBalance <= 0) {
            throw new ValidationError(
              `Invoice ${inv.invoiceNumber} is already fully paid`
            );
          }

          // Tolerance of 1 cent for floating point comparisons
          if (alloc.amount > currentBalance + 0.01) {
            throw new ValidationError(
              `Allocation of $${alloc.amount.toFixed(2)} exceeds outstanding balance of $${currentBalance.toFixed(2)} for invoice ${inv.invoiceNumber}`
            );
          }
        }
      }

      const paymentReference = await this.generatePaymentReference();

      // 1. Create Payment record
      const createdPayment = await tx.payment.create({
        data: {
          paymentReference,
          customerId: dto.customerId,
          amount: new Prisma.Decimal(dto.amount.toFixed(2)),
          currency: dto.currency || 'USD',
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          notes: dto.notes || null,
          recordedById,
        },
      });

      // 2. Create Payment Allocations and update Invoice balances
      for (const alloc of allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: createdPayment.id,
            invoiceId: alloc.invoiceId,
            allocatedAmount: new Prisma.Decimal(alloc.amount.toFixed(2)),
          },
        });

        const targetInvoice = await tx.invoice.findUniqueOrThrow({
          where: { id: alloc.invoiceId },
        });

        const currentPaid = targetInvoice.paidAmount.toNumber();
        const grandTotal = targetInvoice.grandTotal.toNumber();
        const newPaidAmount = Math.min(grandTotal, currentPaid + alloc.amount);
        const newBalanceDue = Math.max(0, grandTotal - newPaidAmount);

        const isFullyPaid = newBalanceDue <= 0.005;

        await tx.invoice.update({
          where: { id: alloc.invoiceId },
          data: {
            paidAmount: new Prisma.Decimal(newPaidAmount.toFixed(2)),
            balanceDue: new Prisma.Decimal(newBalanceDue.toFixed(2)),
            status: isFullyPaid ? InvoiceStatus.PAID : targetInvoice.status,
            paidAt: isFullyPaid ? new Date() : targetInvoice.paidAt,
          },
        });
      }

      // 3. Create Audit Log entry
      await tx.auditLog.create({
        data: {
          userId: recordedById,
          action: 'PAYMENT_RECORDED',
          entityName: 'Payment',
          entityId: createdPayment.id,
          newValues: {
            paymentReference,
            customerId: dto.customerId,
            amount: dto.amount,
            method: dto.paymentMethod,
            allocationsCount: allocations.length,
          },
        },
      });

      return createdPayment;
    });

    logger.info(`Payment recorded: ${payment.paymentReference} ($${payment.amount.toString()})`);
    return this.getPaymentById(payment.id, { id: recordedById, role: UserRole.ADMIN });
  }

  /**
   * List payments with role-based scoping and filters
   */
  async listPayments(
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null },
    filters?: PaymentFilters
  ) {
    const where: Prisma.PaymentWhereInput = {};

    // Customer scoping: Customer only ever inspects their own payments
    if (currentUser.role === UserRole.CUSTOMER) {
      if (!currentUser.customerProfileId) {
        throw new ForbiddenError('Customer profile not found for authenticated user');
      }
      where.customerId = currentUser.customerProfileId;
    } else if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.startDate || filters?.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    if (filters?.search && filters.search.trim()) {
      where.paymentReference = {
        contains: filters.search.trim(),
        mode: 'insensitive',
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: true,
        recordedBy: {
          select: {
            id: true,
            email: true,
          },
        },
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                grandTotal: true,
                balanceDue: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments.map((p) => this.formatPayment(p));
  }

  /**
   * Get single payment by ID with ownership guard
   */
  async getPaymentById(
    id: string,
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null }
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        recordedBy: {
          select: {
            id: true,
            email: true,
          },
        },
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                grandTotal: true,
                balanceDue: true,
                status: true,
                issueDate: true,
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID '${id}' not found`);
    }

    if (currentUser.role === UserRole.CUSTOMER) {
      if (payment.customerId !== currentUser.customerProfileId) {
        throw new ForbiddenError("Access forbidden: You cannot access another customer's payment records");
      }
    }

    return this.formatPayment(payment);
  }

  /**
   * Get outstanding/unpaid confirmed invoices for a customer (for payment allocation)
   */
  async getCustomerUnpaidInvoices(
    customerId: string,
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null }
  ) {
    if (currentUser.role === UserRole.CUSTOMER) {
      if (customerId !== currentUser.customerProfileId) {
        throw new ForbiddenError("Access forbidden: Cannot inspect another customer's invoices");
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
        balanceDue: { gt: 0 },
      },
      orderBy: { dueDate: 'asc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      currency: inv.currency,
      grandTotal: inv.grandTotal.toNumber(),
      paidAmount: inv.paidAmount.toNumber(),
      balanceDue: inv.balanceDue.toNumber(),
      status: inv.status,
    }));
  }

  /**
   * Payment summary metrics & financial distribution
   */
  async getPaymentStats(
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null }
  ): Promise<PaymentSummaryStats> {
    const where: Prisma.PaymentWhereInput = {};

    if (currentUser.role === UserRole.CUSTOMER) {
      if (!currentUser.customerProfileId) {
        throw new ForbiddenError('Customer profile not found for authenticated user');
      }
      where.customerId = currentUser.customerProfileId;
    }

    const payments = await prisma.payment.findMany({
      where,
      select: {
        amount: true,
        paymentDate: true,
        paymentMethod: true,
      },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalCollected = 0;
    let thisMonthCollected = 0;
    const methodBreakdown: Record<string, number> = {};

    for (const p of payments) {
      const amt = p.amount.toNumber();
      totalCollected += amt;

      const pDate = new Date(p.paymentDate);
      if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
        thisMonthCollected += amt;
      }

      methodBreakdown[p.paymentMethod] = (methodBreakdown[p.paymentMethod] || 0) + amt;
    }

    return {
      totalCollected: Math.round(totalCollected * 100) / 100,
      thisMonthCollected: Math.round(thisMonthCollected * 100) / 100,
      totalPaymentsCount: payments.length,
      methodBreakdown,
    };
  }

  private formatPayment(p: any) {
    const totalAllocated = p.allocations
      ? p.allocations.reduce((sum: number, a: any) => sum + (a.allocatedAmount?.toNumber?.() || 0), 0)
      : 0;

    const amountNum = p.amount.toNumber();
    const unallocatedAmount = Math.max(0, amountNum - totalAllocated);

    return {
      id: p.id,
      paymentReference: p.paymentReference,
      customerId: p.customerId,
      amount: amountNum,
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      notes: p.notes,
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      unallocatedAmount: Math.round(unallocatedAmount * 100) / 100,
      customer: p.customer
        ? {
            id: p.customer.id,
            companyName: p.customer.companyName,
            contactName: p.customer.contactName,
            contactEmail: p.customer.contactEmail,
          }
        : undefined,
      recordedBy: p.recordedBy,
      allocations: p.allocations?.map((a: any) => ({
        id: a.id,
        invoiceId: a.invoiceId,
        allocatedAmount: a.allocatedAmount.toNumber(),
        createdAt: a.createdAt,
        invoice: a.invoice
          ? {
              id: a.invoice.id,
              invoiceNumber: a.invoice.invoiceNumber,
              grandTotal: a.invoice.grandTotal?.toNumber?.() ?? a.invoice.grandTotal,
              balanceDue: a.invoice.balanceDue?.toNumber?.() ?? a.invoice.balanceDue,
              status: a.invoice.status,
              issueDate: a.invoice.issueDate,
              dueDate: a.invoice.dueDate,
            }
          : undefined,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
