import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

export const triggerBillingRunSchema = z.object({
  asOfDate: z.string().or(z.date()).optional(),
  subscriptionId: z.string().uuid('Invalid subscription ID').optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus, {
    errorMap: () => ({ message: 'Status must be DRAFT, CONFIRMED, PAID, or CANCELLED' }),
  }),
  notes: z.string().trim().max(1000).optional(),
});
