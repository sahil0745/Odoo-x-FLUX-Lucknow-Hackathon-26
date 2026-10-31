import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;
const MAX_PASSWORD_BYTE_LENGTH = 72; // Strict upper limit to prevent silent bcrypt truncation

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Normalizes password string to Unicode NFKC (Compatibility Decomposition followed by Canonical Composition)
 * to ensure uniform byte sequence across disparate client operating systems and keyboards.
 */
export function normalizePassword(password: string): string {
  return password ? password.normalize('NFKC') : '';
}

/**
 * Validates a password against Brightloop's strict security policy:
 * 1. Must contain MORE THAN 8 characters (length >= 9)
 * 2. Cannot exceed 72 bytes in UTF-8 encoding (prevents silent bcrypt truncation)
 * 3. At least one uppercase letter (A-Z)
 * 4. At least one lowercase letter (a-z)
 * 5. At least one special character (!@#$%^&*...)
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length <= 8) {
    errors.push('Password must be more than 8 characters in length.');
  }

  // Prevent bcrypt silent 72-byte truncation vulnerability
  const byteLength = Buffer.byteLength(password || '', 'utf8');
  if (byteLength > MAX_PASSWORD_BYTE_LENGTH) {
    errors.push(
      `Password exceeds the 72-byte cryptographic length limit (${byteLength} bytes detected). Please choose a password under 72 bytes.`
    );
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
 * Enforces Unicode normalization and guards against inputs exceeding 72 bytes.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const normalized = normalizePassword(plaintext);
  const byteLength = Buffer.byteLength(normalized, 'utf8');

  if (byteLength > MAX_PASSWORD_BYTE_LENGTH) {
    throw new Error(
      `Password length (${byteLength} bytes) exceeds the bcrypt 72-byte limit. Cannot safely hash.`
    );
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(normalized, salt);
}

/**
 * Compare a candidate plaintext password with a stored bcrypt hash.
 * Applies identical Unicode normalization to candidate input.
 */
export async function comparePassword(candidate: string, hash: string): Promise<boolean> {
  if (!candidate || !hash) return false;
  const normalized = normalizePassword(candidate);

  // If candidate is greater than 72 bytes, it can never match a safely hashed password
  if (Buffer.byteLength(normalized, 'utf8') > MAX_PASSWORD_BYTE_LENGTH) {
    return false;
  }

  return bcrypt.compare(normalized, hash);
}
