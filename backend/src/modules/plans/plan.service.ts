import { Prisma, BillingFrequency } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from './plan.types';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class PlanService {
  /**
   * List all subscription plans with optional filtering
   */
  async listPlans(filters?: {
    billingFrequency?: BillingFrequency;
    isActive?: boolean;
    activeOnly?: boolean;
  }) {
    const where: Prisma.SubscriptionPlanWhereInput = {};

    if (filters?.billingFrequency) {
      where.billingFrequency = filters.billingFrequency;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.activeOnly) {
      const now = new Date();
      where.isActive = true;
      where.availableFrom = { lte: now };
      where.OR = [
        { availableUntil: null },
        { availableUntil: { gte: now } },
      ];
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      include: {
        _count: {
          select: {
            subscriptions: true,
            quotations: true,
          },
        },
      },
      orderBy: [{ billingFrequency: 'asc' }, { price: 'asc' }],
    });

    return plans.map((p) => this.formatPlan(p));
  }

  /**
   * Get single subscription plan by ID
   */
  async getPlanById(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
            quotations: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Subscription Plan with ID '${id}' not found`);
    }

    return this.formatPlan(plan);
  }

  /**
   * Create a new subscription plan (Admin only)
   */
  async createPlan(dto: CreateSubscriptionPlanDto) {
    const trimmedName = dto.name.trim();

    const existing = await prisma.subscriptionPlan.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictError(`Subscription plan with name '${trimmedName}' already exists`);
    }

    const availableFrom = dto.availableFrom ? new Date(dto.availableFrom) : new Date();
    const availableUntil = dto.availableUntil ? new Date(dto.availableUntil) : null;

    if (availableUntil && availableUntil <= availableFrom) {
      throw new ValidationError('availableUntil must be strictly after availableFrom');
    }

    const created = await prisma.subscriptionPlan.create({
      data: {
        name: trimmedName,
        description: dto.description?.trim() || null,
        price: new Prisma.Decimal(dto.price.toFixed(2)),
        billingFrequency: dto.billingFrequency,
        intervalCount: dto.intervalCount || 1,
        minimumQuantity: dto.minimumQuantity || 1,
        availableFrom,
        availableUntil,
        allowAutoClose: dto.allowAutoClose ?? false,
        allowEarlyClose: dto.allowEarlyClose ?? true,
        allowPause: dto.allowPause ?? false,
        allowRenewal: dto.allowRenewal ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    logger.info(`[PlanService] Created plan: ${created.name} (${created.id})`);
    return this.formatPlan(created);
  }

  /**
   * Update an existing subscription plan (Admin only)
   */
  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const current = await this.getPlanById(id);

    if (dto.name) {
      const trimmedName = dto.name.trim();
      const existing = await prisma.subscriptionPlan.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictError(`Another subscription plan with name '${trimmedName}' already exists`);
      }
    }

    const availableFrom = dto.availableFrom !== undefined ? new Date(dto.availableFrom) : current.availableFrom;
    const availableUntil =
      dto.availableUntil !== undefined
        ? dto.availableUntil === null
          ? null
          : new Date(dto.availableUntil)
        : current.availableUntil;

    if (availableUntil && availableUntil <= availableFrom) {
      throw new ValidationError('availableUntil must be strictly after availableFrom');
    }

    const updateData: Prisma.SubscriptionPlanUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.price !== undefined) updateData.price = new Prisma.Decimal(dto.price.toFixed(2));
    if (dto.billingFrequency !== undefined) updateData.billingFrequency = dto.billingFrequency;
    if (dto.intervalCount !== undefined) updateData.intervalCount = dto.intervalCount;
    if (dto.minimumQuantity !== undefined) updateData.minimumQuantity = dto.minimumQuantity;
    if (dto.availableFrom !== undefined) updateData.availableFrom = availableFrom;
    if (dto.availableUntil !== undefined) updateData.availableUntil = availableUntil;
    if (dto.allowAutoClose !== undefined) updateData.allowAutoClose = dto.allowAutoClose;
    if (dto.allowEarlyClose !== undefined) updateData.allowEarlyClose = dto.allowEarlyClose;
    if (dto.allowPause !== undefined) updateData.allowPause = dto.allowPause;
    if (dto.allowRenewal !== undefined) updateData.allowRenewal = dto.allowRenewal;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
    });

    logger.info(`[PlanService] Updated plan: ${updated.name} (${updated.id})`);
    return this.formatPlan(updated);
  }

  /**
   * Delete or archive subscription plan (Admin only)
   */
  async deletePlan(id: string) {
    const plan = await this.getPlanById(id);

    const [subCount, quoteCount] = await Promise.all([
      prisma.subscription.count({ where: { planId: id } }),
      prisma.quotation.count({ where: { planId: id } }),
    ]);

    if (subCount > 0 || quoteCount > 0) {
      const deactivated = await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
      logger.info(`[PlanService] Plan ${id} has active contracts/quotes; safely deactivated instead of deleted.`);
      return {
        message: 'Plan is referenced by subscriptions or quotations; safely deactivated instead of deleted.',
        plan: this.formatPlan(deactivated),
      };
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    logger.info(`[PlanService] Permanently deleted plan: ${plan.name} (${id})`);
    return {
      message: `Plan '${plan.name}' was permanently deleted.`,
    };
  }

  /**
   * Format Decimal to number
   */
  private formatPlan(plan: any) {
    return {
      ...plan,
      price: Number(plan.price),
    };
  }
}

export const planService = new PlanService();
