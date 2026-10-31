import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreatePlanDto, UpdatePlanDto, PlanQueryFilters } from './plans.types';
import { NotFoundError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class PlanService {
  async createPlan(dto: CreatePlanDto) {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price: new Prisma.Decimal(dto.price.toString()),
        billingFrequency: dto.billingFrequency,
        intervalCount: dto.intervalCount || 1,
        minimumQuantity: dto.minimumQuantity || 1,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : new Date(),
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null,
        allowAutoClose: dto.allowAutoClose ?? false,
        allowEarlyClose: dto.allowEarlyClose ?? true,
        allowPause: dto.allowPause ?? false,
        allowRenewal: dto.allowRenewal ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    logger.info(`[Plans] Created subscription plan '${plan.name}' (ID: ${plan.id})`);
    return plan;
  }

  async listPlans(filters: PlanQueryFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionPlanWhereInput = {};

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.billingFrequency) {
      where.billingFrequency = filters.billingFrequency;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [items, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscriptionPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getPlanById(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        quotationTemplates: true,
      },
    });

    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.getPlanById(id);

    const data: Prisma.SubscriptionPlanUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price.toString());
    if (dto.billingFrequency !== undefined) data.billingFrequency = dto.billingFrequency;
    if (dto.intervalCount !== undefined) data.intervalCount = dto.intervalCount;
    if (dto.minimumQuantity !== undefined) data.minimumQuantity = dto.minimumQuantity;
    if (dto.availableFrom !== undefined) data.availableFrom = new Date(dto.availableFrom);
    if (dto.availableUntil !== undefined) {
      data.availableUntil = dto.availableUntil ? new Date(dto.availableUntil) : null;
    }
    if (dto.allowAutoClose !== undefined) data.allowAutoClose = dto.allowAutoClose;
    if (dto.allowEarlyClose !== undefined) data.allowEarlyClose = dto.allowEarlyClose;
    if (dto.allowPause !== undefined) data.allowPause = dto.allowPause;
    if (dto.allowRenewal !== undefined) data.allowRenewal = dto.allowRenewal;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });

    logger.info(`[Plans] Updated subscription plan ${id}`);
    return updated;
  }

  async deletePlan(id: string) {
    await this.getPlanById(id);

    const references = await prisma.subscriptionPlan.findUnique({
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

    const isReferenced =
      (references?._count.subscriptions || 0) > 0 ||
      (references?._count.quotations || 0) > 0;

    if (isReferenced) {
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Plan has associated subscriptions or quotations; deactivated instead of deleted.' };
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    return { message: 'Subscription plan deleted successfully' };
  }
}

export const planService = new PlanService();

