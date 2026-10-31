import { z } from 'zod';
import { ProductType } from '@prisma/client';

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Product name must have at least 2 characters').max(200),
    type: z.nativeEnum(ProductType).default(ProductType.SOFTWARE),
    salesPrice: z.coerce.number().min(0, 'Sales price cannot be negative'),
    costPrice: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
    notes: z.string().trim().max(1000).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().default(true),
  })
  .transform((data) => ({
    ...data,
    notes: data.notes || data.description || undefined,
  }));

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    type: z.nativeEnum(ProductType).optional(),
    salesPrice: z.coerce.number().min(0).optional(),
    costPrice: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    notes: data.notes !== undefined ? data.notes : data.description !== undefined ? data.description : undefined,
  }));

export const createProductVariantSchema = z
  .object({
    variantType: z.string().trim().max(100).optional().default('Tier'),
    variantValue: z.string().trim().max(100).optional(),
    name: z.string().trim().max(100).optional(),
    additionalPrice: z.coerce.number().optional().default(0),
    variantPrice: z.coerce.number().optional(),
    isActive: z.boolean().default(true),
  })
  .transform((data) => ({
    variantType: data.variantType || 'Tier',
    variantValue: data.variantValue || data.name || 'Default',
    additionalPrice: data.additionalPrice ?? data.variantPrice ?? 0,
    isActive: data.isActive,
  }));

export const updateProductVariantSchema = z
  .object({
    variantType: z.string().trim().max(100).optional(),
    variantValue: z.string().trim().max(100).optional(),
    name: z.string().trim().max(100).optional(),
    additionalPrice: z.coerce.number().optional(),
    variantPrice: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  })
  .transform((data) => ({
    variantType: data.variantType,
    variantValue: data.variantValue || data.name,
    additionalPrice: data.additionalPrice ?? data.variantPrice,
    isActive: data.isActive,
  }));

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.nativeEnum(ProductType).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

