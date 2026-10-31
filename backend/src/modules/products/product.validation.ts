import { z } from 'zod';
import { ProductType } from '@prisma/client';

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150),
  type: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'Invalid product type. Must be SOFTWARE, SERVICE, or ADD_ON' }),
  }),
  salesPrice: z.number().min(0, 'Sales price cannot be negative'),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  type: z.nativeEnum(ProductType).optional(),
  salesPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createProductVariantSchema = z.object({
  variantType: z.string().trim().min(1, 'Variant type is required (e.g. Brand, Edition, Tier)').max(50),
  variantValue: z.string().trim().min(1, 'Variant value is required (e.g. Odoo, Pro, Enterprise)').max(50),
  additionalPrice: z.number().min(0, 'Additional price must be non-negative'),
  isActive: z.boolean().optional().default(true),
});

export const updateProductVariantSchema = z.object({
  variantType: z.string().trim().min(1).max(50).optional(),
  variantValue: z.string().trim().min(1).max(50).optional(),
  additionalPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});
