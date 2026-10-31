import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateDiscountDto, UpdateDiscountDto, ValidateDiscountDto } from './discounts.types';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class DiscountService {
  async createDiscount(createdById: string, dto: CreateDiscountDto) {
    if (dto.code) {
      const existing = await prisma.discountRule.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (existing) {
        throw new ConflictError('A discount rule with this code already exists');
      }
    }

    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new ValidationError('Start date must be before end date');
    }

    const discount = await prisma.discountRule.create({
      data: {
        name: dto.name.trim(),
        code: dto.code ? dto.code.trim().toUpperCase() : null,
        discountType: dto.discountType,
        value: new Prisma.Decimal(dto.value.toString()),
        scope: dto.scope,
        productId: dto.productId || null,
        minPurchaseAmount: dto.minPurchaseAmount
          ? new Prisma.Decimal(dto.minPurchaseAmount.toString())
          : null,
        minQuantity: dto.minQuantity || null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        maxUsageLimit: dto.maxUsageLimit || null,
        isActive: dto.isActive ?? true,
        createdById,
      },
      include: {
        product: true,
      },
    });

    logger.info(`[Discounts] Created discount rule '${discount.name}' (${discount.code || 'NO-CODE'})`);
    return discount;
  }

  async listDiscounts() {
    return prisma.discountRule.findMany({
      include: {
        product: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDiscountById(id: string) {
    const discount = await prisma.discountRule.findUnique({
      where: { id },
      include: {
        product: true,
        createdBy: { select: { id: true, email: true } },
      },
    });

    if (!discount) {
      throw new NotFoundError('Discount rule not found');
    }

    return discount;
  }

  async updateDiscount(id: string, dto: UpdateDiscountDto) {
    const existing = await this.getDiscountById(id);

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const duplicate = await prisma.discountRule.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (duplicate) {
        throw new ConflictError('A discount rule with this code already exists');
      }
    }

    const data: Prisma.DiscountRuleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code ? dto.code.trim().toUpperCase() : null;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.value !== undefined) data.value = new Prisma.Decimal(dto.value.toString());
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.productId !== undefined) {
      data.product = dto.productId ? { connect: { id: dto.productId } } : { disconnect: true };
    }
    if (dto.minPurchaseAmount !== undefined) {
      data.minPurchaseAmount = dto.minPurchaseAmount
        ? new Prisma.Decimal(dto.minPurchaseAmount.toString())
        : null;
    }
    if (dto.minQuantity !== undefined) data.minQuantity = dto.minQuantity;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.maxUsageLimit !== undefined) data.maxUsageLimit = dto.maxUsageLimit;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await prisma.discountRule.update({
      where: { id },
      data,
      include: { product: true },
    });

    return updated;
  }

  async deleteDiscount(id: string) {
    await this.getDiscountById(id);

    const applications = await prisma.discountApplication.count({
      where: { discountRuleId: id },
    });

    if (applications > 0) {
      await prisma.discountRule.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Discount has historical usage records; deactivated instead of deleted.' };
    }

    await prisma.discountRule.delete({ where: { id } });
    return { message: 'Discount rule deleted successfully' };
  }

  /**
   * Validate and compute discount for a quotation or subscription
   */
  async validateDiscountCode(dto: ValidateDiscountDto) {
    const code = dto.code.trim().toUpperCase();
    const now = new Date();

    const discount = await prisma.discountRule.findUnique({
      where: { code },
      include: { product: true },
    });

    if (!discount || !discount.isActive) {
      throw new ValidationError('Invalid or inactive discount code');
    }

    if (now < discount.startDate) {
      throw new ValidationError('This discount code is not yet active');
    }

    if (now > discount.endDate) {
      throw new ValidationError('This discount code has expired');
    }

    if (discount.maxUsageLimit && discount.currentUsageCount >= discount.maxUsageLimit) {
      throw new ValidationError('This discount code has reached its maximum usage limit');
    }

    if (dto.subtotal && discount.minPurchaseAmount && Number(discount.minPurchaseAmount) > dto.subtotal) {
      throw new ValidationError(
        `Minimum purchase amount of $${Number(discount.minPurchaseAmount).toFixed(2)} required to apply this discount`
      );
    }

    if (dto.quantity && discount.minQuantity && discount.minQuantity > dto.quantity) {
      throw new ValidationError(
        `Minimum quantity of ${discount.minQuantity} items required to apply this discount`
      );
    }

    if (discount.scope === 'PRODUCT' && discount.productId && dto.productId !== discount.productId) {
      throw new ValidationError(`This discount code applies only to ${discount.product?.name || 'specific product'}`);
    }

    // Calculate applied deduction
    let deduction = 0;
    const baseAmount = dto.subtotal || 0;

    if (discount.discountType === 'PERCENTAGE') {
      deduction = (baseAmount * Number(discount.value)) / 100;
    } else {
      deduction = Math.min(baseAmount, Number(discount.value));
    }

    return {
      valid: true,
      discountId: discount.id,
      name: discount.name,
      code: discount.code,
      discountType: discount.discountType,
      value: Number(discount.value),
      scope: discount.scope,
      deductionAmount: Number(deduction.toFixed(2)),
    };
  }
}

export const discountService = new DiscountService();

