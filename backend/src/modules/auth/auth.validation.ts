import { z } from 'zod';
import { validatePasswordPolicy } from '../../utils/password';

const passwordValidation = z
  .string()
  .min(1, 'Password is required')
  .refine((val) => val.length > 8, {
    message: 'Password must contain more than 8 characters',
  })
  .refine((val) => Buffer.byteLength(val, 'utf8') <= 72, {
    message: 'Password cannot exceed 72 bytes in length (bcrypt limitation)',
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

export const customerRegisterSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must contain at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    companyName: z.string().trim().max(150).optional(),
    phone: z.string().trim().max(30).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
