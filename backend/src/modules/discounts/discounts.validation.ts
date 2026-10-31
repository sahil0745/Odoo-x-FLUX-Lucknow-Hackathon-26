import { z } from 'zod';
import { DiscountType, DiscountScope } from '@prisma/client';

export const createDiscountSchema = z.object({
  name: z.string().trim().min(2, 'Discount name must have at least 2 characters').max(150),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Discount code must be at least 3 characters')
    .max(50)
    .optional(),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.PERCENTAGE),
  value: z.coerce.number().positive('Discount value must be greater than zero'),
  scope: z.nativeEnum(DiscountScope).default(DiscountScope.SUBSCRIPTION),
  productId: z.string().uuid().optional().nullable(),
  minPurchaseAmount: z.coerce.number().min(0).optional().nullable(),
  minQuantity: z.coerce.number().int().min(1).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  maxUsageLimit: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateDiscountSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  code: z.string().trim().toUpperCase().min(3).max(50).optional(),
  discountType: z.nativeEnum(DiscountType).optional(),
  value: z.coerce.number().positive().optional(),
  scope: z.nativeEnum(DiscountScope).optional(),
  productId: z.string().uuid().optional().nullable(),
  minPurchaseAmount: z.coerce.number().min(0).optional().nullable(),
  minQuantity: z.coerce.number().int().min(1).optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  maxUsageLimit: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const validateDiscountSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Discount code is required'),
  subtotal: z.coerce.number().optional(),
  productId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
});

