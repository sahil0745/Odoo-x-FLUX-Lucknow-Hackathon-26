import { z } from 'zod';

export const createCustomerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email address required'),
  password: z.string().min(8, 'Password must have at least 8 characters').optional(),
  contactName: z.string().trim().min(2, 'Contact name must have at least 2 characters').max(100),
  companyName: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(30).optional(),
  billingAddress: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  taxNumber: z.string().trim().max(50).optional(),
});

export const updateCustomerProfileSchema = z.object({
  companyName: z.string().trim().max(150).optional(),
  contactName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  billingAddress: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  taxNumber: z.string().trim().max(50).optional(),
});

export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
