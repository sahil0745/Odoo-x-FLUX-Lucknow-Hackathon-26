import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureRandomToken,
  hashToken,
  revokeRefreshToken,
  isRefreshTokenRevoked,
} from '../src/utils/token';

describe('Token Security, Signing & Revocation', () => {
  it('should generate and verify valid JWT access tokens', () => {
    const payload = {
      userId: 'user-uuid-1234',
      email: 'test@brightloop.io',
      role: 'CUSTOMER' as const,
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyAccessToken(token);
    expect(verified.sub).toBe(payload.userId);
    expect(verified.email).toBe(payload.email);
    expect(verified.role).toBe(payload.role);
    expect(verified.type).toBe('access');
  });

  it('should generate and verify valid rotating refresh tokens', () => {
    const payload = { userId: 'user-uuid-5678' };
    const { token, jti } = generateRefreshToken(payload);

    expect(jti).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = verifyRefreshToken(token);
    expect(verified.sub).toBe(payload.userId);
    expect(verified.jti).toBe(jti);
    expect(verified.type).toBe('refresh');
  });

  it('should reject access tokens as refresh tokens and vice-versa', () => {
    const access = generateAccessToken({
      userId: 'u1',
      email: 'u1@brightloop.io',
      role: 'ADMIN' as const,
    });

    expect(() => verifyRefreshToken(access)).toThrow(/(invalid signature|Invalid token type)/i);
  });

  it('should revoke refresh tokens and reject replayed tokens', () => {
    const { token, jti } = generateRefreshToken({ userId: 'u2' });
    expect(isRefreshTokenRevoked(jti)).toBe(false);

    // Revoke token
    revokeRefreshToken(jti);
    expect(isRefreshTokenRevoked(jti)).toBe(true);

    expect(() => verifyRefreshToken(token)).toThrow(/revoked or replayed/i);
  });

  it('should generate unpredictable 64-hex random tokens and deterministic hashes', () => {
    const rawToken1 = generateSecureRandomToken();
    const rawToken2 = generateSecureRandomToken();

    expect(rawToken1).toHaveLength(64);
    expect(rawToken2).toHaveLength(64);
    expect(rawToken1).not.toBe(rawToken2);

    const hash1a = hashToken(rawToken1);
    const hash1b = hashToken(rawToken1);
    const hash2 = hashToken(rawToken2);

    expect(hash1a).toBe(hash1b);
    expect(hash1a).not.toBe(hash2);
    expect(hash1a).toHaveLength(64);
  });
});
