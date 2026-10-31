import { z } from 'zod';
import { SubscriptionStatus } from '@prisma/client';

export const subscriptionLineSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').nullable().optional(),
  taxRuleId: z.string().uuid('Invalid tax rule ID').nullable().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.number().min(0).default(0),
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  planId: z.string().uuid('Invalid plan ID'),
  quotationId: z.string().uuid('Invalid quotation ID').nullable().optional(),
  startDate: z.string().or(z.date()).optional().default(() => new Date().toISOString()),
  paymentTerms: z.string().trim().max(50).default('Net 30'),
  currency: z.string().trim().length(3).default('USD'),
  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.DRAFT),
  lines: z.array(subscriptionLineSchema).min(1, 'Subscription must have at least one line item'),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus, {
    errorMap: () => ({
      message: 'Status must be DRAFT, QUOTATION, CONFIRMED, ACTIVE, PAUSED, or CLOSED',
    }),
  }),
  reason: z.string().trim().max(500).optional(),
});
