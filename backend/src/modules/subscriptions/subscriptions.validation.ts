import { z } from 'zod';
import { SubscriptionStatus } from '@prisma/client';

export const subscriptionLineSchema = z.object({
  productId: z.string().min(1, 'Invalid productId'),
  variantId: z.string().min(1).optional().nullable(),
  taxRuleId: z.string().min(1).optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).default(0),
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Invalid customerId'),
  planId: z.string().min(1, 'Invalid planId'),
  quotationId: z.string().min(1).optional().nullable(),
  startDate: z.coerce.date().default(() => new Date()),
  currency: z.string().min(3).max(5).default('USD'),
  paymentTerms: z.string().default('Net 30'),
  lines: z.array(subscriptionLineSchema).min(1, 'Subscription must have at least one line item'),
  discountRuleIds: z.array(z.string().min(1)).optional(),
});

export const convertQuotationSchema = z.object({
  quotationId: z.string().min(1, 'Invalid quotationId'),
  startDate: z.coerce.date().optional(),
  paymentTerms: z.string().default('Net 30'),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus),
  reason: z.string().trim().max(500).optional(),
});

export const subscriptionQuerySchema = z.object({
  customerId: z.string().min(1).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  search: z.string().trim().optional(),
  dueForBilling: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

