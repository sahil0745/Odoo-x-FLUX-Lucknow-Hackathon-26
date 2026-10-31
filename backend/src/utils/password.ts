import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a password against Brightloop's strict security policy:
 * 1. Must contain MORE THAN 8 characters (length >= 9)
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one special character (!@#$%^&*...)
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length <= 8) {
    errors.push('Password must be more than 8 characters in length.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character (e.g. !@#$%^&*).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hash a plaintext password using bcrypt with work factor 12.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Compare a candidate plaintext password with a stored bcrypt hash.
 */
export async function comparePassword(candidate: string, hash: string): Promise<boolean> {
  if (!candidate || !hash) return false;
  return bcrypt.compare(candidate, hash);
}
