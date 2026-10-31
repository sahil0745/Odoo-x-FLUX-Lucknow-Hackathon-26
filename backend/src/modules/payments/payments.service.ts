import { Prisma, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { RecordPaymentDto, PaymentQueryFilters, PaymentAllocationItemDto } from './payments.types';
import { AuthUser } from '../../types';
import { buildPagination, formatPaginatedResponse } from '../../utils/pagination';
import { FinancialCalculator } from '../../utils/calculation';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class PaymentService {
  /**
   * Generate sequential payment reference: PAY-YYYY-XXXXX
   */
  private async generatePaymentReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;

    const latest = await prisma.payment.findFirst({
      where: { paymentReference: { startsWith: prefix } },
      orderBy: { paymentReference: 'desc' },
      select: { paymentReference: true },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.paymentReference.split('-');
      if (parts.length === 3) {
        seq = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(5, '0')}`;
  }

  /**
   * Record a payment and allocate to customer invoices atomically
   */
  async recordPayment(recordedByUser: AuthUser, dto: RecordPaymentDto) {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }

    const paymentAmount = Number(dto.amount);
    const paymentReference = await this.generatePaymentReference();
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    // Prepare allocations (Manual or FIFO automatic)
    let allocationsToProcess: Array<{ invoiceId: string; amount: number }> = [];

    if (dto.allocations && dto.allocations.length > 0) {
      allocationsToProcess = dto.allocations.map((a) => ({
        invoiceId: a.invoiceId,
        amount: Number(a.amount),
      }));

      const sumAllocated = allocationsToProcess.reduce((sum, a) => sum + a.amount, 0);
      if (sumAllocated > paymentAmount) {
        throw new ValidationError(
          `Total allocated amount ($${sumAllocated}) exceeds the payment amount ($${paymentAmount})`
        );
      }
    } else {
      // Auto-allocation (FIFO: oldest unpaid invoices first)
      const unpaidInvoices = await prisma.invoice.findMany({
        where: {
          customerId: dto.customerId,
          status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT] },
          balanceDue: { gt: new Prisma.Decimal('0.00') },
        },
        orderBy: { issueDate: 'asc' },
      });

      let remainingPayment = paymentAmount;
      for (const inv of unpaidInvoices) {
        if (remainingPayment <= 0) break;
        const bal = Number(inv.balanceDue);
        const toAllocate = Math.min(bal, remainingPayment);
        allocationsToProcess.push({ invoiceId: inv.id, amount: toAllocate });
        remainingPayment -= toAllocate;
      }
    }

    // Execute payment and invoice ledger updates atomically
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const createdPayment = await tx.payment.create({
        data: {
          paymentReference,
          customerId: dto.customerId,
          amount: FinancialCalculator.toDecimal(paymentAmount),
          currency: dto.currency || 'USD',
          paymentMethod: dto.paymentMethod || PaymentMethod.BANK_TRANSFER,
          paymentDate,
          notes: dto.notes?.trim() || null,
          recordedById: recordedByUser.id,
        },
      });

      // 2. Process each allocation
      for (const alloc of allocationsToProcess) {
        const inv = await tx.invoice.findUnique({
          where: { id: alloc.invoiceId },
        });

        if (!inv) {
          throw new NotFoundError(`Invoice ${alloc.invoiceId} not found`);
        }

        if (inv.customerId !== dto.customerId) {
          throw new ValidationError(`Invoice ${inv.invoiceNumber} does not belong to this customer`);
        }

        const currentBal = Number(inv.balanceDue);
        if (alloc.amount > currentBal) {
          throw new ValidationError(
            `Allocated amount ($${alloc.amount}) exceeds invoice ${inv.invoiceNumber} balance due ($${currentBal})`
          );
        }

        const newPaidAmount = Number(inv.paidAmount) + alloc.amount;
        const newBalanceDue = Math.max(0, currentBal - alloc.amount);
        const isFullyPaid = newBalanceDue === 0;

        // Create PaymentAllocation
        await tx.paymentAllocation.create({
          data: {
            paymentId: createdPayment.id,
            invoiceId: alloc.invoiceId,
            allocatedAmount: FinancialCalculator.toDecimal(alloc.amount),
          },
        });

        // Update Invoice
        await tx.invoice.update({
          where: { id: alloc.invoiceId },
          data: {
            paidAmount: FinancialCalculator.toDecimal(newPaidAmount),
            balanceDue: FinancialCalculator.toDecimal(newBalanceDue),
            ...(isFullyPaid
              ? {
                  status: InvoiceStatus.PAID,
                  paidAt: paymentDate,
                }
              : {}),
          },
        });
      }

      return tx.payment.findUnique({
        where: { id: createdPayment.id },
        include: {
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  status: true,
                  grandTotal: true,
                  paidAmount: true,
                  balanceDue: true,
                },
              },
            },
          },
          customer: true,
          recordedBy: {
            select: { id: true, email: true },
          },
        },
      });
    });

    logger.info(
      `[Payments] Recorded payment ${paymentReference} ($${paymentAmount}) for customer ${dto.customerId}`
    );
    return payment;
  }

  /**
   * Allocate an existing payment to invoices
   */
  async allocatePayment(
    user: AuthUser,
    paymentId: string,
    allocations: PaymentAllocationItemDto[]
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const currentAllocated = payment.allocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount),
      0
    );
    const unallocatedBalance = Number(payment.amount) - currentAllocated;

    const requestedTotal = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
    if (requestedTotal > unallocatedBalance) {
      throw new ValidationError(
        `Requested allocation ($${requestedTotal}) exceeds remaining unallocated payment balance ($${unallocatedBalance})`
      );
    }

    return prisma.$transaction(async (tx) => {
      for (const item of allocations) {
        const inv = await tx.invoice.findUnique({ where: { id: item.invoiceId } });
        if (!inv) throw new NotFoundError(`Invoice ${item.invoiceId} not found`);
        if (inv.customerId !== payment.customerId) {
          throw new ValidationError(`Invoice ${inv.invoiceNumber} does not belong to payment customer`);
        }

        const bal = Number(inv.balanceDue);
        const allocAmount = Number(item.amount);
        if (allocAmount > bal) {
          throw new ValidationError(
            `Allocated amount ($${allocAmount}) exceeds invoice ${inv.invoiceNumber} balance ($${bal})`
          );
        }

        await tx.paymentAllocation.create({
          data: {
            paymentId,
            invoiceId: item.invoiceId,
            allocatedAmount: FinancialCalculator.toDecimal(allocAmount),
          },
        });

        const newBal = Math.max(0, bal - allocAmount);
        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: {
            paidAmount: FinancialCalculator.toDecimal(Number(inv.paidAmount) + allocAmount),
            balanceDue: FinancialCalculator.toDecimal(newBal),
            ...(newBal === 0 ? { status: InvoiceStatus.PAID, paidAt: new Date() } : {}),
          },
        });
      }

      return tx.payment.findUnique({
        where: { id: paymentId },
        include: { allocations: { include: { invoice: true } } },
      });
    });
  }

  /**
   * List payments with role-based customer scoping
   */
  async listPayments(user: AuthUser, filters: PaymentQueryFilters) {
    const { page, limit, skip, take } = buildPagination(filters);

    const where: Prisma.PaymentWhereInput = {};

    if (user.role === 'CUSTOMER') {
      if (!user.customerProfileId) {
        throw new ForbiddenError('No customer profile associated with user');
      }
      where.customerId = user.customerProfileId;
    } else if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          customer: { select: { id: true, companyName: true, contactName: true, user: { select: { email: true } } } },
          recordedBy: { select: { id: true, email: true } },
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  grandTotal: true,
                  paidAmount: true,
                  balanceDue: true,
                },
              },
            },
          },
          _count: { select: { allocations: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);

    return formatPaginatedResponse(items, total, page, limit);
  }

  /**
   * Get single payment detail
   */
  async getPaymentById(user: AuthUser, id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        recordedBy: { select: { id: true, email: true } },
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                grandTotal: true,
                paidAmount: true,
                balanceDue: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (user.role === 'CUSTOMER' && payment.customerId !== user.customerProfileId) {
      throw new ForbiddenError('Access forbidden: You cannot view payments of another customer');
    }

    return payment;
  }
}

export const paymentService = new PaymentService();
