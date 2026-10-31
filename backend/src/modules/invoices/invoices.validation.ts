import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

export const invoiceLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().nullable(),
  taxRuleId: z.string().min(1).optional().nullable(),
  description: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
});

export const createManualInvoiceSchema = z.object({
  subscriptionId: z.string().min(1, 'Invalid subscriptionId'),
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(invoiceLineSchema).min(1).optional(),
});

export const generateRecurringInvoiceSchema = z.object({
  subscriptionId: z.string().min(1, 'Invalid subscriptionId'),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  notes: z.string().trim().max(500).optional(),
});

export const invoiceQuerySchema = z.object({
  customerId: z.string().min(1).optional(),
  subscriptionId: z.string().min(1).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  overdueOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

