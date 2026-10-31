import { z } from 'zod';
import { ProductType } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Helper to validate non-negative monetary amounts represented as strings or numbers.
 * Converts to Prisma.Decimal to verify exact numeric integrity.
 */
export const priceSchema = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      try {
        const d = new Prisma.Decimal(val);
        return !d.isNaN() && d.isFinite() && d.gte(0);
      } catch {
        return false;
      }
    },
    { message: 'Price must be a valid, non-negative monetary amount' }
  )
  .transform((val) => new Prisma.Decimal(val).toFixed(2));

export const createVariantInputSchema = z.object({
  variantType: z
    .string({ required_error: 'Variant type is required' })
    .trim()
    .min(1, 'Variant type cannot be empty')
    .max(50, 'Variant type cannot exceed 50 characters'),
  variantValue: z
    .string({ required_error: 'Variant value is required' })
    .trim()
    .min(1, 'Variant value cannot be empty')
    .max(100, 'Variant value cannot exceed 100 characters'),
  additionalPrice: priceSchema,
});

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(1, 'Product name cannot be empty')
    .max(200, 'Product name cannot exceed 200 characters'),
  type: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Invalid product type. Must be SOFTWARE, SERVICE, or ADD_ON' }),
  }),
  salesPrice: priceSchema,
  costPrice: priceSchema,
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
  isActive: z.boolean().optional().default(true),
  variants: z.array(createVariantInputSchema).optional(),
});

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Product name cannot be empty')
      .max(200, 'Product name cannot exceed 200 characters')
      .optional(),
    type: z
      .nativeEnum(ProductType, {
        errorMap: () => ({ message: 'Invalid product type. Must be SOFTWARE, SERVICE, or ADD_ON' }),
      })
      .optional(),
    salesPrice: priceSchema.optional(),
    costPrice: priceSchema.optional(),
    notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateProductStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status boolean is required' }),
});

export const createVariantSchema = createVariantInputSchema;

export const updateVariantSchema = z
  .object({
    variantType: z.string().trim().min(1).max(50).optional(),
    variantValue: z.string().trim().min(1).max(100).optional(),
    additionalPrice: priceSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const calculatePriceSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).uuid('Invalid Product ID format'),
  selectedVariantIds: z
    .array(z.string().uuid('Invalid Variant ID format'))
    .default([]),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  type: z.nativeEnum(ProductType).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'salesPrice', 'createdAt', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
