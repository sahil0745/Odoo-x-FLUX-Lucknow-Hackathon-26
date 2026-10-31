import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const paymentAllocationSchema = z.object({
  invoiceId: z.string().min(1, 'Invalid invoiceId'),
  amount: z.coerce.number().positive('Allocated amount must be positive'),
});

export const recordPaymentSchema = z.object({
  customerId: z.string().min(1, 'Invalid customerId'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  currency: z.string().min(3).max(5).default('USD'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  paymentDate: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(1000).optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
});

export const paymentQuerySchema = z.object({
  customerId: z.string().min(1).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

