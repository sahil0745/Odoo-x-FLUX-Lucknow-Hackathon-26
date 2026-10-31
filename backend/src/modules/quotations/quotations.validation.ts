import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';

export const quotationLineSchema = z.object({
  productId: z.string().min(1, 'Invalid productId'),
  variantId: z.string().min(1).optional().nullable(),
  taxRuleId: z.string().min(1).optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().min(1, 'Invalid customerId'),
  planId: z.string().min(1, 'Invalid planId'),
  templateId: z.string().min(1).optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  currency: z.string().min(3).max(5).default('USD'),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(quotationLineSchema).min(1, 'Quotation must have at least one line item'),
});

export const updateQuotationSchema = z.object({
  planId: z.string().min(1).optional(),
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(quotationLineSchema).min(1).optional(),
});

export const quotationStatusSchema = z.object({
  status: z.nativeEnum(QuotationStatus),
});

export const createQuotationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  planId: z.string().min(1),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional().nullable(),
        quantity: z.coerce.number().int().min(1).default(1),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1, 'Template must contain at least one line'),
});

export const quotationQuerySchema = z.object({
  customerId: z.string().min(1).optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

