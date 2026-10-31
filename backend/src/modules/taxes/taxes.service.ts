import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './taxes.types';
import { NotFoundError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class TaxService {
  async createTaxRule(dto: CreateTaxRuleDto) {
    // If setting as default, unset any existing default
    if (dto.isDefault) {
      await prisma.taxRule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const taxRule = await prisma.taxRule.create({
      data: {
        name: dto.name.trim(),
        taxType: dto.taxType,
        rate: new Prisma.Decimal(dto.rate.toString()),
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        description: dto.description?.trim() || null,
        ...(dto.productIds && dto.productIds.length > 0
          ? {
              productMappings: {
                create: dto.productIds.map((productId) => ({ productId })),
              },
            }
          : {}),
      },
      include: {
        productMappings: {
          include: { product: true },
        },
      },
    });

    logger.info(`[Taxes] Created tax rule '${taxRule.name}' (${taxRule.rate}%)`);
    return taxRule;
  }

  async listTaxRules(onlyActive = false) {
    return prisma.taxRule.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        productMappings: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaxRuleById(id: string) {
    const taxRule = await prisma.taxRule.findUnique({
      where: { id },
      include: {
        productMappings: {
          include: { product: true },
        },
      },
    });

    if (!taxRule) {
      throw new NotFoundError('Tax rule not found');
    }

    return taxRule;
  }

  async updateTaxRule(id: string, dto: UpdateTaxRuleDto) {
    await this.getTaxRuleById(id);

    if (dto.isDefault) {
      await prisma.taxRule.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data: Prisma.TaxRuleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.taxType !== undefined) data.taxType = dto.taxType;
    if (dto.rate !== undefined) data.rate = new Prisma.Decimal(dto.rate.toString());
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;

    if (dto.productIds !== undefined) {
      // Re-map products
      await prisma.taxRuleProduct.deleteMany({ where: { taxRuleId: id } });
      if (dto.productIds.length > 0) {
        data.productMappings = {
          create: dto.productIds.map((productId) => ({ productId })),
        };
      }
    }

    const updated = await prisma.taxRule.update({
      where: { id },
      data,
      include: {
        productMappings: {
          include: { product: true },
        },
      },
    });

    return updated;
  }

  async deleteTaxRule(id: string) {
    await this.getTaxRuleById(id);

    const count = await prisma.taxRule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotationLines: true,
            subscriptionLines: true,
            invoiceLines: true,
          },
        },
      },
    });

    const isUsed =
      (count?._count.quotationLines || 0) > 0 ||
      (count?._count.subscriptionLines || 0) > 0 ||
      (count?._count.invoiceLines || 0) > 0;

    if (isUsed) {
      await prisma.taxRule.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Tax rule has historical usage; deactivated instead of deleted.' };
    }

    await prisma.taxRule.delete({ where: { id } });
    return { message: 'Tax rule deleted successfully' };
  }
}

export const taxService = new TaxService();

