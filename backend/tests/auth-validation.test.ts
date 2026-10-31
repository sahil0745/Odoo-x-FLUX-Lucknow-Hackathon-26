import { describe, it, expect } from 'vitest';
import {
  customerRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../src/modules/auth/auth.validation';

describe('Auth Validation Schemas (Zod)', () => {
  describe('customerRegisterSchema', () => {
    it('should validate a complete valid registration request', () => {
      const validPayload = {
        fullName: 'Jane Doe',
        email: 'jane.doe@enterprise.com',
        password: 'SecurePassword2026!',
        confirmPassword: 'SecurePassword2026!',
        companyName: 'Acme Corp',
        phone: '+1 555-0199',
      };

      const result = customerRegisterSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('jane.doe@enterprise.com');
      }
    });

    it('should fail when passwords do not match', () => {
      const mismatchedPayload = {
        fullName: 'Jane Doe',
        email: 'jane.doe@enterprise.com',
        password: 'SecurePassword2026!',
        confirmPassword: 'DifferentPassword2026!',
      };

      const result = customerRegisterSchema.safeParse(mismatchedPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmErr = result.error.errors.find((e) => e.path.includes('confirmPassword'));
        expect(confirmErr?.message).toBe('Passwords do not match');
      }
    });

    it('should fail on invalid email addresses', () => {
      const invalidEmailPayload = {
        fullName: 'Jane Doe',
        email: 'invalid-email-format',
        password: 'SecurePassword2026!',
        confirmPassword: 'SecurePassword2026!',
      };

      const result = customerRegisterSchema.safeParse(invalidEmailPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('valid email');
      }
    });

    it('should strip public role injection if attempted', () => {
      const roleInjectionPayload = {
        fullName: 'Attacker User',
        email: 'attacker@evil.com',
        password: 'SecurePassword2026!',
        confirmPassword: 'SecurePassword2026!',
        role: 'ADMIN', // Publicly injected role
      };

      const result = customerRegisterSchema.safeParse(roleInjectionPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        // Schema must not contain role
        expect((result.data as any).role).toBeUndefined();
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login inputs', () => {
      const result = loginSchema.safeParse({
        email: 'user@brightloop.io',
        password: 'AnyPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password or invalid email', () => {
      expect(loginSchema.safeParse({ email: 'bad-email', password: '123' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'user@brightloop.io', password: '' }).success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate normalized email', () => {
      const result = forgotPasswordSchema.safeParse({ email: ' USER@Brightloop.IO ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@brightloop.io');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate token and matching compliant password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-secure-token-12345',
        password: 'BrandNewPassword2026!',
        confirmPassword: 'BrandNewPassword2026!',
      });
      expect(result.success).toBe(true);
    });
  });
});
