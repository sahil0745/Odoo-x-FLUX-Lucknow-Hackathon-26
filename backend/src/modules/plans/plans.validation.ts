import { z } from 'zod';
import { BillingFrequency } from '@prisma/client';

export const createPlanSchema = z
  .object({
    name: z.string().trim().min(2, 'Plan name must have at least 2 characters').max(150),
    description: z.string().trim().max(1000).optional(),
    price: z.coerce.number().min(0, 'Plan price cannot be negative').default(0),
    billingFrequency: z.nativeEnum(BillingFrequency).default(BillingFrequency.MONTHLY),
    intervalCount: z.coerce.number().int().min(1).default(1),
    minimumQuantity: z.coerce.number().int().min(1).default(1),
    availableFrom: z.coerce.date().default(() => new Date()),
    availableUntil: z.coerce.date().optional().nullable(),
    allowAutoClose: z.boolean().default(false),
    allowEarlyClose: z.boolean().default(true),
    allowPause: z.boolean().default(false),
    allowRenewal: z.boolean().default(true),
    isRenewable: z.boolean().optional(),
    autoCloseAfterDays: z.coerce.number().optional().nullable(),
    trialDays: z.coerce.number().optional().default(0),
    isActive: z.boolean().default(true),
  })
  .transform((data) => ({
    ...data,
    allowRenewal: data.isRenewable !== undefined ? data.isRenewable : data.allowRenewal,
  }));

export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    price: z.coerce.number().min(0).optional(),
    billingFrequency: z.nativeEnum(BillingFrequency).optional(),
    intervalCount: z.coerce.number().int().min(1).optional(),
    minimumQuantity: z.coerce.number().int().min(1).optional(),
    availableFrom: z.coerce.date().optional(),
    availableUntil: z.coerce.date().optional().nullable(),
    allowAutoClose: z.boolean().optional(),
    allowEarlyClose: z.boolean().optional(),
    allowPause: z.boolean().optional(),
    allowRenewal: z.boolean().optional(),
    isRenewable: z.boolean().optional(),
    autoCloseAfterDays: z.coerce.number().optional().nullable(),
    trialDays: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    allowRenewal: data.isRenewable !== undefined ? data.isRenewable : data.allowRenewal,
  }));

export const planQuerySchema = z.object({
  billingFrequency: z.nativeEnum(BillingFrequency).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

