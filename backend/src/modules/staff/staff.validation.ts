import { z } from 'zod';

const passwordValidation = z
  .string()
  .min(1, 'Password is required')
  .refine((val) => val.length > 8, {
    message: 'Password must contain more than 8 characters',
  })
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(val), {
    message: 'Password must contain at least one special character',
  });

export const createStaffSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: passwordValidation,
  department: z.string().trim().max(100).optional(),
  title: z.string().trim().max(100).optional(),
});

export const updateStaffSchema = z.object({
  department: z.string().trim().max(100).optional(),
  title: z.string().trim().max(100).optional(),
});

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive status is required',
  }),
});
