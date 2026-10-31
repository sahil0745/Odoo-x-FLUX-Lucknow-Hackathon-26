import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  ProductQueryFilters,
} from './products.types';
import { ConflictError, NotFoundError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class ProductService {
  /**
   * Create a new product catalog entry
   */
  async createProduct(dto: CreateProductDto) {
    const product = await prisma.product.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        salesPrice: new Prisma.Decimal(dto.salesPrice.toString()),
        costPrice: new Prisma.Decimal((dto.costPrice || 0).toString()),
        notes: dto.notes?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        variants: true,
      },
    });

    logger.info(`[Products] Created product '${product.name}' (ID: ${product.id})`);
    return product;
  }

  /**
   * Retrieve paginated products with filtering
   */
  async listProducts(filters: ProductQueryFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            where: { isActive: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
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

  /**
   * Get single product by ID including all variants
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        taxRules: {
          include: { taxRule: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  /**
   * Update product attributes
   */
  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProductById(id);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.salesPrice !== undefined) data.salesPrice = new Prisma.Decimal(dto.salesPrice.toString());
    if (dto.costPrice !== undefined) data.costPrice = new Prisma.Decimal(dto.costPrice.toString());
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        variants: true,
      },
    });

    logger.info(`[Products] Updated product ${id}`);
    return updated;
  }

  /**
   * Delete or soft-deactivate product
   */
  async deleteProduct(id: string) {
    const product = await this.getProductById(id);

    // Check if referenced in quotations, subscriptions, or invoices
    const references = await prisma.product.findUnique({
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

    const isReferenced =
      (references?._count.quotationLines || 0) > 0 ||
      (references?._count.subscriptionLines || 0) > 0 ||
      (references?._count.invoiceLines || 0) > 0;

    if (isReferenced) {
      // Soft-deactivate if referenced by financial or sales records
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Product is referenced by active records; it has been deactivated instead of deleted.' };
    }

    await prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  /**
   * Add a variant to a product
   */
  async createVariant(productId: string, dto: CreateProductVariantDto) {
    await this.getProductById(productId);

    try {
      const variant = await prisma.productVariant.create({
        data: {
          productId,
          variantType: dto.variantType.trim(),
          variantValue: dto.variantValue.trim(),
          additionalPrice: new Prisma.Decimal(dto.additionalPrice.toString()),
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      logger.info(`[Products] Created variant ${variant.variantType}:${variant.variantValue} for product ${productId}`);
      return variant;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictError('A variant with this type and value already exists for this product');
      }
      throw error;
    }
  }

  /**
   * Update an existing product variant
   */
  async updateVariant(productId: string, variantId: string, dto: UpdateProductVariantDto) {
    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!existing) {
      throw new NotFoundError('Product variant not found');
    }

    const data: Prisma.ProductVariantUpdateInput = {};
    if (dto.variantType !== undefined) data.variantType = dto.variantType.trim();
    if (dto.variantValue !== undefined) data.variantValue = dto.variantValue.trim();
    if (dto.additionalPrice !== undefined) data.additionalPrice = new Prisma.Decimal(dto.additionalPrice.toString());
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });

    return updated;
  }

  /**
   * Delete a variant
   */
  async deleteVariant(productId: string, variantId: string) {
    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!existing) {
      throw new NotFoundError('Product variant not found');
    }

    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Product variant removed successfully' };
  }
}

export const productService = new ProductService();

