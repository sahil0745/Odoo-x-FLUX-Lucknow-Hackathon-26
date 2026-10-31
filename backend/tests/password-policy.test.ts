import { describe, it, expect } from 'vitest';
import {
  validatePasswordPolicy,
  hashPassword,
  comparePassword,
} from '../src/utils/password';

describe('Password Security Policy & Hashing', () => {
  it('should accept valid passwords meeting all criteria', () => {
    const validPasswords = [
      'Brightloop2026!',
      'StrongP@ssw0rd',
      'C0mpl3x#Pass',
      'Enterprise_Grade_2026$',
    ];

    validPasswords.forEach((pw) => {
      const result = validatePasswordPolicy(pw);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should reject passwords that are 8 characters or shorter', () => {
    // Exactly 8 chars: Must contain MORE than 8 characters per Requirement 3.5
    const shortPassword = 'Pass12!';
    const result = validatePasswordPolicy(shortPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be more than 8 characters in length.');

    const exact8Password = 'Pass123!';
    const result8 = validatePasswordPolicy(exact8Password);
    expect(result8.isValid).toBe(false);
    expect(result8.errors).toContain('Password must be more than 8 characters in length.');
  });

  it('should reject passwords missing uppercase letters', () => {
    const noUpper = 'brightloop2026!';
    const result = validatePasswordPolicy(noUpper);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter.');
  });

  it('should reject passwords missing lowercase letters', () => {
    const noLower = 'BRIGHTLOOP2026!';
    const result = validatePasswordPolicy(noLower);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter.');
  });

  it('should reject passwords missing special characters', () => {
    const noSpecial = 'Brightloop2026';
    const result = validatePasswordPolicy(noSpecial);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character (e.g. !@#$%^&*).');
  });

  it('should correctly hash and verify passwords using bcrypt', async () => {
    const plaintext = 'SuperSecret2026@!';
    const hash = await hashPassword(plaintext);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$2')).toBe(true); // Standard bcrypt prefix

    const isMatch = await comparePassword(plaintext, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });
});
