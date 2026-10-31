import { Prisma, ProductType, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateProductDto,
  UpdateProductDto,
  ListProductsQuery,
  CreateVariantDto,
  UpdateVariantDto,
  ProductResponse,
  PriceCalculationResult,
} from './products.types';
import { productPricingService } from './product-pricing.service';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class ProductsService {
  /**
   * Create a new product with optional initial variants in a single database transaction.
   * Admin only.
   */
  async createProduct(dto: CreateProductDto): Promise<ProductResponse> {
    const normalizedName = dto.name.trim();

    // 1. Prevent duplicate product names (case-insensitive check)
    const existing = await prisma.product.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictError(`A product named '${normalizedName}' already exists`);
    }

    // 2. Validate initial variants if provided (detect duplicate types/values in input)
    if (dto.variants && dto.variants.length > 0) {
      const seenVariantCombos = new Set<string>();
      for (const v of dto.variants) {
        const key = `${v.variantType.trim().toLowerCase()}:::${v.variantValue.trim().toLowerCase()}`;
        if (seenVariantCombos.has(key)) {
          throw new ValidationError(
            `Duplicate variant definition in request: '${v.variantType}: ${v.variantValue}'`
          );
        }
        seenVariantCombos.add(key);
      }
    }

    // 3. Atomic creation via Prisma transaction
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: normalizedName,
          type: dto.type,
          salesPrice: new Prisma.Decimal(dto.salesPrice),
          costPrice: new Prisma.Decimal(dto.costPrice),
          notes: dto.notes?.trim() || null,
          isActive: dto.isActive ?? true,
          variants:
            dto.variants && dto.variants.length > 0
              ? {
                  create: dto.variants.map((v) => ({
                    variantType: v.variantType.trim(),
                    variantValue: v.variantValue.trim(),
                    additionalPrice: new Prisma.Decimal(v.additionalPrice),
                    isActive: true,
                  })),
                }
              : undefined,
        },
        include: {
          variants: true,
        },
      });

      return product;
    });

    logger.info(`[Products] Created product '${created.name}' (${created.id}) with ${created.variants.length} variants`);

    return this.formatProduct(created, 'ADMIN');
  }

  /**
   * Paginated, searchable, filtered list of products with role-based field sanitization.
   */
  async listProducts(
    query: ListProductsQuery,
    userRole: UserRole
  ): Promise<{ items: ProductResponse[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    // Customers can only see active products
    if (userRole === 'CUSTOMER') {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ...(userRole !== 'CUSTOMER' ? [{ notes: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }] : []),
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          variants: {
            where: userRole === 'CUSTOMER' ? { isActive: true } : undefined,
            orderBy: { variantType: 'asc' },
          },
        },
      }),
    ]);

    const items = products.map((p) => this.formatProduct(p, userRole));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve a single product by ID with role-based field projection.
   */
  async getProductById(id: string, userRole: UserRole): Promise<ProductResponse> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          where: userRole === 'CUSTOMER' ? { isActive: true } : undefined,
          orderBy: { variantType: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Customers cannot access deactivated products via direct ID lookup
    if (userRole === 'CUSTOMER' && !product.isActive) {
      throw new NotFoundError('Product not found or is currently unavailable');
    }

    return this.formatProduct(product, userRole);
  }

  /**
   * Update product attributes.
   * Admin only. Preserves historical financial records without mutating existing quotation/subscription snapshots.
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();
      if (normalizedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await prisma.product.findFirst({
          where: {
            name: { equals: normalizedName, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (duplicate) {
          throw new ConflictError(`Another product named '${normalizedName}' already exists`);
        }
      }
      data.name = normalizedName;
    }

    if (dto.type !== undefined) {
      data.type = dto.type;
    }

    if (dto.salesPrice !== undefined) {
      data.salesPrice = new Prisma.Decimal(dto.salesPrice);
    }

    if (dto.costPrice !== undefined) {
      data.costPrice = new Prisma.Decimal(dto.costPrice);
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes ? dto.notes.trim() : null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        variants: {
          orderBy: { variantType: 'asc' },
        },
      },
    });

    logger.info(`[Products] Updated product '${updated.name}' (${updated.id})`);
    return this.formatProduct(updated, 'ADMIN');
  }

  /**
   * Toggle product active/inactive status.
   */
  async updateProductStatus(id: string, isActive: boolean): Promise<ProductResponse> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive },
      include: {
        variants: true,
      },
    });

    logger.info(`[Products] Product '${updated.name}' status set to isActive=${isActive}`);
    return this.formatProduct(updated, 'ADMIN');
  }

  /**
   * Safe archival / physical deletion.
   * CRITICAL FINANCIAL INTEGRITY: Rejects physical deletion if referenced by existing quotations,
   * subscriptions, or invoices to prevent historical audit corruption.
   */
  async deleteProduct(id: string): Promise<{ deleted: boolean; message: string }> {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotationLines: true,
            subscriptionLines: true,
            invoiceLines: true,
            quotationTemplateLines: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const refCount =
      existing._count.quotationLines +
      existing._count.subscriptionLines +
      existing._count.invoiceLines +
      existing._count.quotationTemplateLines;

    if (refCount > 0) {
      throw new ConflictError(
        `Cannot delete product '${existing.name}': It is referenced by ${refCount} existing historical records (quotations, subscriptions, or invoices). Please deactivate the product instead to preserve historical audit integrity.`
      );
    }

    // Safe to delete if no historical transactions reference it
    await prisma.product.delete({ where: { id } });
    logger.info(`[Products] Physically deleted unused product '${existing.name}' (${id})`);

    return {
      deleted: true,
      message: `Product '${existing.name}' was successfully deleted`,
    };
  }

  /**
   * Create a variant for a specific product.
   * Admin only. Enforces @@unique([productId, variantType, variantValue]).
   */
  async createVariant(productId: string, dto: CreateVariantDto) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const variantType = dto.variantType.trim();
    const variantValue = dto.variantValue.trim();

    // Check uniqueness constraint
    const existing = await prisma.productVariant.findUnique({
      where: {
        productId_variantType_variantValue: {
          productId,
          variantType,
          variantValue,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `A variant with type '${variantType}' and value '${variantValue}' already exists for this product`
      );
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        variantType,
        variantValue,
        additionalPrice: new Prisma.Decimal(dto.additionalPrice),
        isActive: true,
      },
    });

    logger.info(`[Products] Created variant '${variant.variantType}: ${variant.variantValue}' for product ${productId}`);

    return {
      id: variant.id,
      productId: variant.productId,
      variantType: variant.variantType,
      variantValue: variant.variantValue,
      additionalPrice: variant.additionalPrice.toFixed(2),
      isActive: variant.isActive,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  /**
   * Update an existing variant.
   */
  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundError('Variant not found for the specified product');
    }

    const data: Prisma.ProductVariantUpdateInput = {};

    const newType = dto.variantType !== undefined ? dto.variantType.trim() : variant.variantType;
    const newValue = dto.variantValue !== undefined ? dto.variantValue.trim() : variant.variantValue;

    if (newType !== variant.variantType || newValue !== variant.variantValue) {
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
        throw new ConflictError(
          `A variant with type '${newType}' and value '${newValue}' already exists for this product`
        );
      }

      data.variantType = newType;
      data.variantValue = newValue;
    }

    if (dto.additionalPrice !== undefined) {
      data.additionalPrice = new Prisma.Decimal(dto.additionalPrice);
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });

    return {
      id: updated.id,
      productId: updated.productId,
      variantType: updated.variantType,
      variantValue: updated.variantValue,
      additionalPrice: updated.additionalPrice.toFixed(2),
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete or deactivate variant with reference protection.
   */
  async deleteVariant(productId: string, variantId: string): Promise<{ deleted: boolean; message: string }> {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: {
        _count: {
          select: {
            quotationLines: true,
            subscriptionLines: true,
            invoiceLines: true,
            quotationTemplateLines: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundError('Variant not found for the specified product');
    }

    const refCount =
      variant._count.quotationLines +
      variant._count.subscriptionLines +
      variant._count.invoiceLines +
      variant._count.quotationTemplateLines;

    if (refCount > 0) {
      throw new ConflictError(
        `Cannot delete variant '${variant.variantType}: ${variant.variantValue}': It is referenced by ${refCount} historical financial records. Please deactivate it instead.`
      );
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
    logger.info(`[Products] Deleted unused variant ${variantId} from product ${productId}`);

    return {
      deleted: true,
      message: `Variant '${variant.variantType}: ${variant.variantValue}' was successfully deleted`,
    };
  }

  /**
   * Execute pricing calculation using the Decimal pricing engine.
   */
  async calculatePrice(productId: string, selectedVariantIds: string[]): Promise<PriceCalculationResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    let variants: any[] = [];
    if (selectedVariantIds && selectedVariantIds.length > 0) {
      variants = await prisma.productVariant.findMany({
        where: {
          id: { in: selectedVariantIds },
          productId,
        },
      });

      if (variants.length !== selectedVariantIds.length) {
        throw new ValidationError('One or more selected variants do not exist or do not belong to this product');
      }
    }

    const result = productPricingService.calculateProductPrice(
      product.salesPrice,
      variants,
      productId
    );

    return {
      productId: product.id,
      productName: product.name,
      baseSalesPrice: result.basePrice,
      selectedVariants: result.selectedVariants,
      totalVariantAdditions: result.totalVariantAdditions,
      finalPrice: result.finalPrice,
      currency: 'USD',
    };
  }

  /**
   * Helper to format product and sanitize sensitive fields based on user role.
   * - CUSTOMER: Strip costPrice and notes.
   * - STAFF: Strip costPrice.
   * - ADMIN: Return complete fields.
   */
  private formatProduct(product: any, userRole: UserRole): ProductResponse {
    const formatted: ProductResponse = {
      id: product.id,
      name: product.name,
      type: product.type,
      salesPrice: product.salesPrice.toFixed(2),
      isActive: product.isActive,
      variantCount: product.variants ? product.variants.length : undefined,
      variants: product.variants
        ? product.variants.map((v: any) => ({
            id: v.id,
            productId: v.productId,
            variantType: v.variantType,
            variantValue: v.variantValue,
            additionalPrice: v.additionalPrice.toFixed(2),
            isActive: v.isActive,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          }))
        : undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    if (userRole === 'ADMIN') {
      formatted.costPrice = product.costPrice.toFixed(2);
      formatted.notes = product.notes;
    } else if (userRole === 'STAFF') {
      formatted.notes = product.notes;
      // costPrice is strictly omitted for STAFF
    }
    // CUSTOMER receives neither costPrice nor notes

    return formatted;
  }
}

export const productsService = new ProductsService();
