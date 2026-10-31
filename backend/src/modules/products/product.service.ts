import { Prisma, ProductType } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
} from './product.types';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class ProductService {
  /**
   * List all products with optional filters
   */
  async listProducts(filters?: {
    search?: string;
    type?: ProductType;
    isActive?: boolean;
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search && filters.search.trim()) {
      where.name = {
        contains: filters.search.trim(),
        mode: 'insensitive',
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: {
          orderBy: [{ variantType: 'asc' }, { variantValue: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => this.formatProduct(p));
  }

  /**
   * Retrieve a single product by ID
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ variantType: 'asc' }, { variantValue: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    return this.formatProduct(product);
  }

  /**
   * Create a new product (Admin only)
   */
  async createProduct(dto: CreateProductDto) {
    const trimmedName = dto.name.trim();

    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictError(`Product with name '${trimmedName}' already exists`);
    }

    const created = await prisma.product.create({
      data: {
        name: trimmedName,
        type: dto.type,
        salesPrice: new Prisma.Decimal(dto.salesPrice.toFixed(2)),
        costPrice: new Prisma.Decimal(dto.costPrice.toFixed(2)),
        notes: dto.notes?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        variants: true,
      },
    });

    logger.info(`[ProductService] Created product: ${created.name} (${created.id})`);
    return this.formatProduct(created);
  }

  /**
   * Update an existing product (Admin only)
   */
  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProductById(id);

    if (dto.name) {
      const trimmedName = dto.name.trim();
      const existing = await prisma.product.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictError(`Another product with name '${trimmedName}' already exists`);
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.salesPrice !== undefined) updateData.salesPrice = new Prisma.Decimal(dto.salesPrice.toFixed(2));
    if (dto.costPrice !== undefined) updateData.costPrice = new Prisma.Decimal(dto.costPrice.toFixed(2));
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: {
          orderBy: [{ variantType: 'asc' }, { variantValue: 'asc' }],
        },
      },
    });

    logger.info(`[ProductService] Updated product: ${updated.name} (${updated.id})`);
    return this.formatProduct(updated);
  }

  /**
   * Delete or archive product (Admin only)
   */
  async deleteProduct(id: string) {
    const product = await this.getProductById(id);

    // Check if referenced in historical financial records
    const [quoteCount, subCount, invoiceCount] = await Promise.all([
      prisma.quotationLine.count({ where: { productId: id } }),
      prisma.subscriptionLine.count({ where: { productId: id } }),
      prisma.invoiceLine.count({ where: { productId: id } }),
    ]);

    if (quoteCount > 0 || subCount > 0 || invoiceCount > 0) {
      // Deactivate instead of hard delete to preserve historical integrity
      const deactivated = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      logger.info(`[ProductService] Product ${id} has linked financial lines; deactivated instead of deletion.`);
      return {
        message: 'Product contains historical financial records; safely deactivated instead of deleted.',
        product: this.formatProduct(deactivated),
      };
    }

    await prisma.product.delete({ where: { id } });
    logger.info(`[ProductService] Deleted product: ${product.name} (${id})`);
    return {
      message: `Product '${product.name}' was permanently deleted.`,
    };
  }

  /**
   * Add a variant to a product (Admin only)
   */
  async createVariant(productId: string, dto: CreateProductVariantDto) {
    await this.getProductById(productId);

    const variantType = dto.variantType.trim();
    const variantValue = dto.variantValue.trim();

    const existingVariant = await prisma.productVariant.findUnique({
      where: {
        productId_variantType_variantValue: {
          productId,
          variantType,
          variantValue,
        },
      },
    });

    if (existingVariant) {
      throw new ConflictError(
        `Variant '${variantType}: ${variantValue}' already exists for this product`
      );
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        variantType,
        variantValue,
        additionalPrice: new Prisma.Decimal(dto.additionalPrice.toFixed(2)),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    logger.info(
      `[ProductService] Added variant '${variantType}: ${variantValue}' to product ${productId}`
    );

    return this.formatVariant(variant);
  }

  /**
   * Update an existing product variant (Admin only)
   */
  async updateVariant(productId: string, variantId: string, dto: UpdateProductVariantDto) {
    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!existing) {
      throw new NotFoundError(`Variant '${variantId}' for product '${productId}' not found`);
    }

    const newType = dto.variantType?.trim() || existing.variantType;
    const newValue = dto.variantValue?.trim() || existing.variantValue;

    if (newType !== existing.variantType || newValue !== existing.variantValue) {
      const duplicate = await prisma.productVariant.findUnique({
        where: {
          productId_variantType_variantValue: {
            productId,
            variantType: newType,
            variantValue: newValue,
          },
        },
      });
      if (duplicate && duplicate.id !== variantId) {
        throw new ConflictError(`Variant '${newType}: ${newValue}' already exists for this product`);
      }
    }

    const updateData: Prisma.ProductVariantUpdateInput = {};
    if (dto.variantType !== undefined) updateData.variantType = newType;
    if (dto.variantValue !== undefined) updateData.variantValue = newValue;
    if (dto.additionalPrice !== undefined) {
      updateData.additionalPrice = new Prisma.Decimal(dto.additionalPrice.toFixed(2));
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    logger.info(`[ProductService] Updated variant ${variantId} on product ${productId}`);
    return this.formatVariant(updated);
  }

  /**
   * Delete or archive a product variant (Admin only)
   */
  async deleteVariant(productId: string, variantId: string) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundError(`Variant '${variantId}' for product '${productId}' not found`);
    }

    const [quoteCount, subCount, invoiceCount] = await Promise.all([
      prisma.quotationLine.count({ where: { variantId } }),
      prisma.subscriptionLine.count({ where: { variantId } }),
      prisma.invoiceLine.count({ where: { variantId } }),
    ]);

    if (quoteCount > 0 || subCount > 0 || invoiceCount > 0) {
      const deactivated = await prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
      });
      return {
        message: 'Variant is referenced in financial records; safely deactivated.',
        variant: this.formatVariant(deactivated),
      };
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
    return {
      message: `Variant '${variant.variantType}: ${variant.variantValue}' deleted successfully.`,
    };
  }

  /**
   * Helper to format Decimal types to number and compute margins
   */
  private formatProduct(product: any) {
    const salesPrice = Number(product.salesPrice);
    const costPrice = Number(product.costPrice);
    const margin = salesPrice > 0 ? Number((((salesPrice - costPrice) / salesPrice) * 100).toFixed(2)) : 0;

    return {
      ...product,
      salesPrice,
      costPrice,
      marginPercent: margin,
      variants: product.variants ? product.variants.map((v: any) => this.formatVariant(v, salesPrice)) : undefined,
    };
  }

  private formatVariant(variant: any, baseSalesPrice?: number) {
    const additionalPrice = Number(variant.additionalPrice);
    const effectivePrice = baseSalesPrice !== undefined ? Number((baseSalesPrice + additionalPrice).toFixed(2)) : undefined;

    return {
      ...variant,
      additionalPrice,
      effectivePrice,
    };
  }
}

export const productService = new ProductService();
