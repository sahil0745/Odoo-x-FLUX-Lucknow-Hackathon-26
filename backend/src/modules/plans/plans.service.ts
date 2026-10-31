import { Prisma, UserRole, BillingFrequency } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import {
  CreatePlanDto,
  UpdatePlanDto,
  ListPlansQuery,
  PlanResponse,
  AssociatedProductSummary,
} from './plans.types';
import { billingFrequencyService } from './billing-frequency.service';
import { planQuantityService, QuantityValidationResult } from './plan-quantity.service';
import { planAvailabilityService, PlanAvailabilityStatus } from './plan-availability.service';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class PlansService {
  /**
   * Helper to format a database SubscriptionPlan record into a standard PlanResponse.
   */
  private formatPlanResponse(
    plan: {
      id: string;
      name: string;
      description: string | null;
      price: Prisma.Decimal;
      billingFrequency: BillingFrequency;
      intervalCount: number;
      minimumQuantity: number;
      availableFrom: Date;
      availableUntil: Date | null;
      allowAutoClose: boolean;
      allowEarlyClose: boolean;
      allowPause: boolean;
      allowRenewal: boolean;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      _count?: {
        subscriptions?: number;
        quotationTemplates?: number;
      };
      quotationTemplates?: Array<{
        lines?: Array<{
          product: {
            id: string;
            name: string;
            type: string;
            salesPrice: Prisma.Decimal;
          };
        }>;
      }>;
    },
    userRole?: UserRole
  ): PlanResponse {
    const currency = env.DEFAULT_CURRENCY || 'USD';
    const availabilityResult = planAvailabilityService.checkPlanAvailability(plan);

    const priceString = new Prisma.Decimal(plan.price).toFixed(2);
    const cadenceFormatted = billingFrequencyService.formatBillingCadence(
      priceString,
      plan.billingFrequency,
      plan.intervalCount,
      currency
    );

    // Extract associated products from quotation templates if present
    const associatedProducts: AssociatedProductSummary[] = [];
    if (plan.quotationTemplates) {
      const seenProductIds = new Set<string>();
      for (const tpl of plan.quotationTemplates) {
        if (tpl.lines) {
          for (const line of tpl.lines) {
            if (line.product && !seenProductIds.has(line.product.id)) {
              seenProductIds.add(line.product.id);
              associatedProducts.push({
                id: line.product.id,
                name: line.product.name,
                type: line.product.type,
                salesPrice: line.product.salesPrice.toString(),
              });
            }
          }
        }
      }
    }

    const response: PlanResponse = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: priceString,
      billingFrequency: plan.billingFrequency,
      intervalCount: plan.intervalCount,
      minimumQuantity: plan.minimumQuantity,
      availableFrom: plan.availableFrom,
      availableUntil: plan.availableUntil,
      allowAutoClose: plan.allowAutoClose,
      allowEarlyClose: plan.allowEarlyClose,
      allowPause: plan.allowPause,
      allowRenewal: plan.allowRenewal,
      isActive: plan.isActive,
      currency,
      cadenceFormatted,
      availabilityStatus: availabilityResult.status,
      isAvailable: availabilityResult.isAvailable,
      activeSubscriptionCount: plan._count?.subscriptions,
      associatedTemplatesCount: plan._count?.quotationTemplates,
      associatedProducts: associatedProducts.length > 0 ? associatedProducts : undefined,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };

    return response;
  }

  /**
   * Create a new subscription plan.
   * Admin only.
   */
  async createPlan(dto: CreatePlanDto): Promise<PlanResponse> {
    const normalizedName = dto.name.trim();

    // 1. Detect duplicate plan name (case-insensitive)
    const existing = await prisma.subscriptionPlan.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictError(`A subscription plan named '${normalizedName}' already exists.`);
    }

    // 2. Validate date window
    const availableFrom = new Date(dto.availableFrom);
    const availableUntil = dto.availableUntil ? new Date(dto.availableUntil) : null;
    planAvailabilityService.validateDateWindow(availableFrom, availableUntil);

    // 3. Validate associated products if provided
    if (dto.associatedProductIds && dto.associatedProductIds.length > 0) {
      const activeProducts = await prisma.product.findMany({
        where: {
          id: { in: dto.associatedProductIds },
          isActive: true,
        },
        select: { id: true, name: true },
      });

      if (activeProducts.length !== dto.associatedProductIds.length) {
        throw new ValidationError(
          'One or more associated products do not exist or are currently inactive.'
        );
      }
    }

    // 4. Persistence via Prisma
    const priceDecimal = new Prisma.Decimal(dto.price);

    const createdPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          name: normalizedName,
          description: dto.description?.trim() || null,
          price: priceDecimal,
          billingFrequency: dto.billingFrequency,
          intervalCount: dto.intervalCount ?? 1,
          minimumQuantity: dto.minimumQuantity ?? 1,
          availableFrom,
          availableUntil,
          allowAutoClose: dto.allowAutoClose ?? false,
          allowEarlyClose: dto.allowEarlyClose ?? true,
          allowPause: dto.allowPause ?? false,
          allowRenewal: dto.allowRenewal ?? true,
          isActive: dto.isActive ?? true,
        },
      });

      // If associated products provided, create a default QuotationTemplate linking this plan to those products
      if (dto.associatedProductIds && dto.associatedProductIds.length > 0) {
        await tx.quotationTemplate.create({
          data: {
            name: `${normalizedName} - Standard Bundle`,
            planId: plan.id,
            validityDays: 30,
            description: `Default quotation template for ${normalizedName}`,
            isActive: true,
            lines: {
              create: dto.associatedProductIds.map((productId) => ({
                productId,
                quantity: plan.minimumQuantity,
                unitPrice: priceDecimal,
              })),
            },
          },
        });
      }

      return tx.subscriptionPlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: {
          _count: {
            select: { subscriptions: true, quotationTemplates: true },
          },
          quotationTemplates: {
            where: { isActive: true },
            include: {
              lines: {
                include: {
                  product: {
                    select: { id: true, name: true, type: true, salesPrice: true },
                  },
                },
              },
            },
          },
        },
      });
    });

    logger.info(`Subscription plan created: '${createdPlan.name}' (${createdPlan.id})`);
    return this.formatPlanResponse(createdPlan);
  }

  /**
   * List subscription plans with search, filters, sorting, and pagination.
   * Customers only see active, currently available plans.
   */
  async listPlans(
    query: ListPlansQuery,
    userRole: UserRole = UserRole.CUSTOMER
  ): Promise<{
    plans: PlanResponse[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionPlanWhereInput = {};
    const now = new Date();

    // 1. Role-based visibility enforcement
    if (userRole === UserRole.CUSTOMER) {
      // Customers ONLY see active and available plans
      where.isActive = true;
      where.availableFrom = { lte: now };
      where.OR = [{ availableUntil: null }, { availableUntil: { gte: now } }];
    } else {
      // Admin and Staff can filter by active status
      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      // Filter by availability window if requested
      if (query.availability === 'available') {
        where.isActive = true;
        where.availableFrom = { lte: now };
        where.OR = [{ availableUntil: null }, { availableUntil: { gte: now } }];
      } else if (query.availability === 'upcoming') {
        where.availableFrom = { gt: now };
      } else if (query.availability === 'expired') {
        where.availableUntil = { lt: now };
      }
    }

    // 2. Billing Frequency filter
    if (query.billingFrequency) {
      where.billingFrequency = query.billingFrequency;
    }

    // 3. Search query (matches name or description)
    if (query.search && query.search.trim()) {
      const searchTerms = query.search.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { name: { contains: searchTerms, mode: 'insensitive' } },
            { description: { contains: searchTerms, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 4. Sorting
    const orderBy: Prisma.SubscriptionPlanOrderByWithRelationInput = {};
    const sortField = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortOrder ?? 'desc';
    orderBy[sortField] = sortDirection;

    // 5. Query execution
    const [total, plans] = await Promise.all([
      prisma.subscriptionPlan.count({ where }),
      prisma.subscriptionPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { subscriptions: true, quotationTemplates: true },
          },
          quotationTemplates: {
            where: { isActive: true },
            include: {
              lines: {
                include: {
                  product: {
                    select: { id: true, name: true, type: true, salesPrice: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      plans: plans.map((p) => this.formatPlanResponse(p, userRole)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get single plan by ID.
   */
  async getPlanById(id: string, userRole: UserRole = UserRole.CUSTOMER): Promise<PlanResponse> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true, quotationTemplates: true },
        },
        quotationTemplates: {
          where: { isActive: true },
          include: {
            lines: {
              include: {
                product: {
                  select: { id: true, name: true, type: true, salesPrice: true },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Subscription plan with ID '${id}' not found`);
    }

    // Customers cannot view inactive or expired plans
    if (userRole === UserRole.CUSTOMER) {
      const availability = planAvailabilityService.checkPlanAvailability(plan);
      if (!availability.isAvailable) {
        throw new NotFoundError(`Subscription plan is not currently available.`);
      }
    }

    return this.formatPlanResponse(plan, userRole);
  }

  /**
   * Update an existing plan.
   * Admin only.
   */
  async updatePlan(id: string, dto: UpdatePlanDto): Promise<PlanResponse> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Subscription plan with ID '${id}' not found`);
    }

    // 1. Check for duplicate name if name is being changed
    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.subscriptionPlan.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (duplicate) {
        throw new ConflictError(`Another plan named '${dto.name.trim()}' already exists.`);
      }
    }

    // 2. Validate date window
    const targetFrom = dto.availableFrom ? new Date(dto.availableFrom) : existing.availableFrom;
    const targetUntil =
      dto.availableUntil !== undefined
        ? dto.availableUntil
          ? new Date(dto.availableUntil)
          : null
        : existing.availableUntil;

    planAvailabilityService.validateDateWindow(targetFrom, targetUntil);

    // 3. Build update data payload
    const updateData: Prisma.SubscriptionPlanUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.price !== undefined) updateData.price = new Prisma.Decimal(dto.price);
    if (dto.billingFrequency !== undefined) updateData.billingFrequency = dto.billingFrequency;
    if (dto.intervalCount !== undefined) updateData.intervalCount = dto.intervalCount;
    if (dto.minimumQuantity !== undefined) updateData.minimumQuantity = dto.minimumQuantity;
    if (dto.availableFrom !== undefined) updateData.availableFrom = targetFrom;
    if (dto.availableUntil !== undefined) updateData.availableUntil = targetUntil;
    if (dto.allowAutoClose !== undefined) updateData.allowAutoClose = dto.allowAutoClose;
    if (dto.allowEarlyClose !== undefined) updateData.allowEarlyClose = dto.allowEarlyClose;
    if (dto.allowPause !== undefined) updateData.allowPause = dto.allowPause;
    if (dto.allowRenewal !== undefined) updateData.allowRenewal = dto.allowRenewal;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { subscriptions: true, quotationTemplates: true },
        },
        quotationTemplates: {
          where: { isActive: true },
          include: {
            lines: {
              include: {
                product: {
                  select: { id: true, name: true, type: true, salesPrice: true },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Subscription plan updated: '${updated.name}' (${updated.id})`);
    return this.formatPlanResponse(updated);
  }

  /**
   * Safe status update (Activate / Deactivate).
   * Admin only.
   */
  async updatePlanStatus(id: string, isActive: boolean): Promise<PlanResponse> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Subscription plan with ID '${id}' not found`);
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive },
      include: {
        _count: {
          select: { subscriptions: true, quotationTemplates: true },
        },
        quotationTemplates: {
          where: { isActive: true },
          include: {
            lines: {
              include: {
                product: {
                  select: { id: true, name: true, type: true, salesPrice: true },
                },
              },
            },
          },
        },
      },
    });

    logger.info(
      `Subscription plan '${updated.name}' (${updated.id}) status set to ${isActive ? 'ACTIVE' : 'INACTIVE'}`
    );
    return this.formatPlanResponse(updated);
  }

  /**
   * Delete a plan if not referenced by existing subscriptions, quotations, or templates.
   * Admin only.
   */
  async deletePlan(id: string): Promise<{ success: boolean; message: string }> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
            quotations: true,
            quotationTemplates: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError(`Subscription plan with ID '${id}' not found`);
    }

    const subCount = plan._count?.subscriptions || 0;
    const quotCount = plan._count?.quotations || 0;
    const tplCount = plan._count?.quotationTemplates || 0;

    if (subCount > 0 || quotCount > 0 || tplCount > 0) {
      throw new ConflictError(
        `Cannot delete subscription plan '${plan.name}' because it is referenced by existing business records (${subCount} subscriptions, ${quotCount} quotations, ${tplCount} templates). Please deactivate the plan instead.`
      );
    }

    await prisma.subscriptionPlan.delete({
      where: { id },
    });

    logger.info(`Subscription plan deleted: '${plan.name}' (${id})`);
    return {
      success: true,
      message: `Subscription plan '${plan.name}' has been successfully deleted.`,
    };
  }

  /**
   * Validate requested quantity for a plan.
   * Checks both plan availability and minimum quantity.
   */
  async validatePlanQuantity(id: string, quantity: number): Promise<QuantityValidationResult> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundError(`Subscription plan with ID '${id}' not found`);
    }

    // First check plan availability
    const availability = planAvailabilityService.checkPlanAvailability(plan);
    if (!availability.isAvailable) {
      return {
        isValid: false,
        error: availability.reason || 'Plan is currently not available',
        requestedQuantity: quantity,
        minimumQuantity: plan.minimumQuantity,
      };
    }

    return planQuantityService.validateQuantity(quantity, plan.minimumQuantity);
  }
}

export const plansService = new PlansService();
