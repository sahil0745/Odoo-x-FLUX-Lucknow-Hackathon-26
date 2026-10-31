import { z } from 'zod';
import { TaxType } from '@prisma/client';

export const createTaxRuleSchema = z.object({
  name: z.string().trim().min(2, 'Tax name must have at least 2 characters').max(100),
  taxType: z.nativeEnum(TaxType).default(TaxType.PERCENTAGE),
  rate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  description: z.string().trim().max(500).optional(),
  productIds: z.array(z.string().uuid()).optional(),
});

export const updateTaxRuleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  taxType: z.nativeEnum(TaxType).optional(),
  rate: z.coerce.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  description: z.string().trim().max(500).optional(),
  productIds: z.array(z.string().uuid()).optional(),
});

