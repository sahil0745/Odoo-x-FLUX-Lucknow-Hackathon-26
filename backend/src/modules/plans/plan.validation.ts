import { z } from 'zod';
import { BillingFrequency } from '@prisma/client';

export const createSubscriptionPlanSchema = z.object({
  name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(100),
  description: z.string().trim().max(1000).optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  billingFrequency: z.nativeEnum(BillingFrequency, {
    errorMap: () => ({ message: 'Invalid billing frequency. Must be DAILY, WEEKLY, MONTHLY, or YEARLY' }),
  }),
  intervalCount: z.number().int().min(1, 'Interval count must be at least 1').optional().default(1),
  minimumQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1').optional().default(1),
  availableFrom: z.string().or(z.date()).optional().default(() => new Date().toISOString()),
  availableUntil: z.string().or(z.date()).nullable().optional(),
  allowAutoClose: z.boolean().optional().default(false),
  allowEarlyClose: z.boolean().optional().default(true),
  allowPause: z.boolean().optional().default(false),
  allowRenewal: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

export const updateSubscriptionPlanSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().min(0).optional(),
  billingFrequency: z.nativeEnum(BillingFrequency).optional(),
  intervalCount: z.number().int().min(1).optional(),
  minimumQuantity: z.number().int().min(1).optional(),
  availableFrom: z.string().or(z.date()).optional(),
  availableUntil: z.string().or(z.date()).nullable().optional(),
  allowAutoClose: z.boolean().optional(),
  allowEarlyClose: z.boolean().optional(),
  allowPause: z.boolean().optional(),
  allowRenewal: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
