import { Prisma, SubscriptionStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionStatusDto,
} from './subscriptions.types';
import { BillingFrequencyService } from '../plans/billing-frequency.service';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

const billingFrequencyService = new BillingFrequencyService();

export class SubscriptionsService {
  /**
   * Generate sequential subscription number
   */
  private async generateSubscriptionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.subscription.count();
    const sequence = String(count + 1).padStart(5, '0');
    return `SUB-${year}-${sequence}`;
  }

  /**
   * List subscriptions with role-based scoping and filtering
   */
  async listSubscriptions(
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null },
    filters?: {
      customerId?: string;
      status?: SubscriptionStatus;
      search?: string;
    }
  ) {
    const where: Prisma.SubscriptionWhereInput = {};

    // Customer can strictly view only their own subscriptions
    if (currentUser.role === UserRole.CUSTOMER) {
      if (!currentUser.customerProfileId) {
        throw new ForbiddenError('Customer profile not found for authenticated user');
      }
      where.customerId = currentUser.customerProfileId;
    } else if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search && filters.search.trim()) {
      where.subscriptionNumber = {
        contains: filters.search.trim(),
        mode: 'insensitive',
      };
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            billingCycleLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((s) => this.formatSubscription(s));
  }

  /**
   * Get single subscription by ID
   */
  async getSubscriptionById(
    id: string,
    currentUser: { id: string; role: UserRole; customerProfileId?: string | null }
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
            taxRule: true,
          },
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
        billingCycleLogs: {
          orderBy: { processedAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError(`Subscription '${id}' not found`);
    }

    if (
      currentUser.role === UserRole.CUSTOMER &&
      subscription.customerId !== currentUser.customerProfileId
    ) {
      throw new ForbiddenError("You cannot view another customer's subscription");
    }

    return this.formatSubscription(subscription);
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    dto: CreateSubscriptionDto,
    createdById?: string
  ) {
    const [customer, plan] = await Promise.all([
      prisma.customerProfile.findUnique({ where: { id: dto.customerId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } }),
    ]);

    if (!customer) throw new NotFoundError(`Customer profile '${dto.customerId}' not found`);
    if (!plan) throw new NotFoundError(`Subscription plan '${dto.planId}' not found`);

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const cycle = billingFrequencyService.calculateBillingCycle(
      startDate,
      plan.billingFrequency,
      plan.intervalCount
    );

    // Calculate line totals and aggregate
    let subtotalCents = 0;
    let taxCents = 0;
    let discountCents = 0;

    const formattedLines = dto.lines.map((line) => {
      const unitCents = Math.round(line.unitPrice * 100);
      const qty = line.quantity || 1;
      const lineSubtotalCents = unitCents * qty;
      const lineDiscountCents = Math.round((line.discountAmount || 0) * 100);
      const lineTaxCents = Math.round((line.taxAmount || 0) * 100);
      const lineTotalCents = lineSubtotalCents - lineDiscountCents + lineTaxCents;

      subtotalCents += lineSubtotalCents;
      discountCents += lineDiscountCents;
      taxCents += lineTaxCents;

      return {
        productId: line.productId,
        variantId: line.variantId || null,
        taxRuleId: line.taxRuleId || null,
        quantity: qty,
        unitPrice: new Prisma.Decimal((unitCents / 100).toFixed(2)),
        discountAmount: new Prisma.Decimal((lineDiscountCents / 100).toFixed(2)),
        taxRate: new Prisma.Decimal((line.taxRate || 0).toFixed(2)),
        taxAmount: new Prisma.Decimal((lineTaxCents / 100).toFixed(2)),
        lineTotal: new Prisma.Decimal((lineTotalCents / 100).toFixed(2)),
      };
    });

    const totalCents = subtotalCents - discountCents + taxCents;
    const subscriptionNumber = await this.generateSubscriptionNumber();

    const created = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId: dto.customerId,
        planId: dto.planId,
        quotationId: dto.quotationId || null,
        status: dto.status || SubscriptionStatus.DRAFT,
        startDate,
        nextBillingDate: cycle.periodStart,
        paymentTerms: dto.paymentTerms || 'Net 30',
        currency: dto.currency || 'USD',
        subtotal: new Prisma.Decimal((subtotalCents / 100).toFixed(2)),
        taxAmount: new Prisma.Decimal((taxCents / 100).toFixed(2)),
        discountAmount: new Prisma.Decimal((discountCents / 100).toFixed(2)),
        totalAmount: new Prisma.Decimal((totalCents / 100).toFixed(2)),
        lines: {
          create: formattedLines,
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: dto.status || SubscriptionStatus.DRAFT,
            changedById: createdById || null,
            reason: 'Subscription agreement created',
          },
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: true,
      },
    });

    logger.info(`[SubscriptionsService] Created subscription ${created.subscriptionNumber} (${created.id})`);
    return this.formatSubscription(created);
  }

  /**
   * Update subscription lifecycle status
   */
  async updateSubscriptionStatus(
    id: string,
    dto: UpdateSubscriptionStatusDto,
    changedById?: string
  ) {
    const current = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!current) throw new NotFoundError(`Subscription '${id}' not found`);

    if (current.status === dto.status) {
      return this.formatSubscription(current);
    }

    // Rules validation
    if (dto.status === SubscriptionStatus.PAUSED && !current.plan.allowPause) {
      throw new ValidationError(`Plan '${current.plan.name}' does not allow pausing`);
    }

    if (dto.status === SubscriptionStatus.CLOSED && !current.plan.allowEarlyClose) {
      throw new ValidationError(`Plan '${current.plan.name}' does not allow early closure`);
    }

    const updateData: Prisma.SubscriptionUpdateInput = {
      status: dto.status,
    };

    if (dto.status === SubscriptionStatus.PAUSED) {
      updateData.pausedAt = new Date();
    } else if (current.status === SubscriptionStatus.PAUSED) {
      updateData.pausedAt = null;
    }

    if (dto.status === SubscriptionStatus.CLOSED) {
      updateData.closedAt = new Date();
      updateData.closureReason = dto.reason || 'Closed by operator';
    }

    const [updated] = await prisma.$transaction([
      prisma.subscription.update({
        where: { id },
        data: updateData,
        include: { customer: true, plan: true, lines: true },
      }),
      prisma.subscriptionStatusHistory.create({
        data: {
          subscriptionId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          changedById: changedById || null,
          reason: dto.reason || `Status updated to ${dto.status}`,
        },
      }),
    ]);

    logger.info(`[SubscriptionsService] Subscription ${updated.subscriptionNumber} status: ${current.status} -> ${dto.status}`);
    return this.formatSubscription(updated);
  }

  /**
   * Helper to format Decimal types to number
   */
  public formatSubscription(sub: any) {
    return {
      ...sub,
      subtotal: Number(sub.subtotal),
      taxAmount: Number(sub.taxAmount),
      discountAmount: Number(sub.discountAmount),
      totalAmount: Number(sub.totalAmount),
      lines: sub.lines
        ? sub.lines.map((l: any) => ({
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

export const subscriptionsService = new SubscriptionsService();
