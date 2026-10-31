import { z } from 'zod';
import { BillingFrequency } from '@prisma/client';

const decimalPriceValidator = z
  .union([
    z.number().min(0, 'Price must be greater than or equal to 0'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid non-negative decimal amount (e.g. 10.00)'),
  ])
  .refine(
    (val) => {
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: 'Price must be greater than or equal to 0' }
  );

export const createPlanSchema = z
  .object({
    name: z
      .string({ required_error: 'Plan name is mandatory' })
      .trim()
      .min(1, 'Plan name is mandatory')
      .max(200, 'Plan name cannot exceed 200 characters'),
    description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
    price: decimalPriceValidator,
    billingFrequency: z.nativeEnum(BillingFrequency, {
      errorMap: () => ({ message: 'Billing frequency must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' }),
    }),
    intervalCount: z.coerce.number().int('Interval count must be an integer').min(1, 'Interval count must be at least 1').default(1),
    minimumQuantity: z.coerce.number().int('Minimum quantity must be an integer').min(1, 'Minimum quantity must be at least 1').default(1),
    availableFrom: z.coerce.date({ invalid_type_error: 'Valid start date is required' }),
    availableUntil: z.coerce.date({ invalid_type_error: 'Invalid end date format' }).optional().nullable(),
    allowAutoClose: z.boolean().default(false),
    allowEarlyClose: z.boolean().default(true),
    allowPause: z.boolean().default(false),
    allowRenewal: z.boolean().default(true),
    isActive: z.boolean().default(true),
    associatedProductIds: z.array(z.string().uuid('Invalid product ID format')).optional(),
  })
  .refine(
    (data) => {
      if (data.availableUntil) {
        return data.availableUntil.getTime() >= data.availableFrom.getTime();
      }
      return true;
    },
    {
      message: 'Availability end date cannot precede start date',
      path: ['availableUntil'],
    }
  );

export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(1, 'Plan name is mandatory').max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    price: decimalPriceValidator.optional(),
    billingFrequency: z.nativeEnum(BillingFrequency).optional(),
    intervalCount: z.coerce.number().int().min(1).optional(),
    minimumQuantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').optional(),
    availableFrom: z.coerce.date().optional(),
    availableUntil: z.coerce.date().optional().nullable(),
    allowAutoClose: z.boolean().optional(),
    allowEarlyClose: z.boolean().optional(),
    allowPause: z.boolean().optional(),
    allowRenewal: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.availableFrom && data.availableUntil) {
        return data.availableUntil.getTime() >= data.availableFrom.getTime();
      }
      return true;
    },
    {
      message: 'Availability end date cannot precede start date',
      path: ['availableUntil'],
    }
  );

export const updatePlanStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

export const listPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  billingFrequency: z.nativeEnum(BillingFrequency).optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  availability: z.enum(['all', 'available', 'upcoming', 'expired']).default('all'),
  sortBy: z.enum(['name', 'price', 'createdAt', 'billingFrequency', 'minimumQuantity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const validateQuantitySchema = z.object({
  quantity: z.coerce.number({ invalid_type_error: 'Quantity must be a valid number' }),
});

export const calculateNextBillingDateSchema = z.object({
  startDate: z.coerce.date({ invalid_type_error: 'Invalid start date format' }),
  billingFrequency: z.nativeEnum(BillingFrequency, {
    errorMap: () => ({ message: 'Billing frequency must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' }),
  }),
  intervalCount: z.coerce.number().int().min(1).default(1),
  anchorDay: z.coerce.number().int().min(1).max(31).optional(),
});
