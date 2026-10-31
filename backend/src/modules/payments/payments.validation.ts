import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const paymentAllocationSchema = z.object({
  invoiceId: z.string().uuid({ message: 'Valid invoice UUID is required' }),
  amount: z
    .number()
    .positive({ message: 'Allocated amount must be greater than zero' })
    .max(10000000, { message: 'Allocated amount exceeds allowable ceiling' }),
});

export const createPaymentSchema = z
  .object({
    customerId: z.string().uuid({ message: 'Valid customer profile UUID is required' }),
    amount: z
      .number()
      .positive({ message: 'Payment amount must be greater than zero' })
      .max(10000000, { message: 'Payment amount exceeds allowable limit' }),
    currency: z.string().min(3).max(3).default('USD'),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      errorMap: () => ({ message: 'Invalid payment method' }),
    }),
    paymentDate: z.string().datetime().or(z.date()).optional(),
    notes: z.string().max(500).optional(),
    allocations: z.array(paymentAllocationSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (!data.allocations || data.allocations.length === 0) return true;
      const sumAllocated = data.allocations.reduce((sum, item) => sum + item.amount, 0);
      // Floating precision tolerance (1 cent)
      return sumAllocated <= data.amount + 0.001;
    },
    {
      message: 'Sum of allocated amounts cannot exceed the total payment amount',
      path: ['allocations'],
    }
  );

export const paymentFiltersSchema = z.object({
  customerId: z.string().uuid().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(50).optional(),
});
