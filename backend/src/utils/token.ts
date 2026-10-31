import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  jti: string; // Unique Token Identifier
  familyId: string; // Token family for rotation & reuse tracking
  type: 'refresh';
}

/**
 * Generate a cryptographically strong random token (64 hex characters)
 * Used for email verification and single-use password resets.
 */
export function generateSecureRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 hash of a raw token before database persistence.
 * Prevents plain-text token exposure even if database is dumped.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a short-lived Access Token (default: 15 minutes)
 */
export function generateAccessToken(payload: { userId: string; email: string; role: UserRole }): string {
  const tokenPayload: AccessTokenPayload = {
    sub: payload.userId,
    email: payload.email,
    role: payload.role,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  };

  return jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, options);
}

/**
 * Generate a long-lived rotating Refresh Token (default: 7 days)
 * Embeds a unique JTI and Family ID for reuse detection and family revocation.
 */
export function generateRefreshToken(payload: {
  userId: string;
  familyId?: string;
}): { token: string; jti: string; familyId: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const familyId = payload.familyId || crypto.randomUUID();

  const tokenPayload: RefreshTokenPayload = {
    sub: payload.userId,
    jti,
    familyId,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  };

  const token = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, options);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, jti, familyId, expiresAt };
}

// In-memory revocation cache for lightweight unit-test assertions & fallback
const inMemoryRevokedJtis = new Set<string>();

export function revokeRefreshToken(jti: string): void {
  inMemoryRevokedJtis.add(jti);
}

export function isRefreshTokenRevoked(jti: string): boolean {
  return inMemoryRevokedJtis.has(jti);
}

export function revokeAllUserTokens(userId: string): void {
  // Backward compatibility stub; primary session revocation uses sessionStore.revokeAllUserSessions
}


/**
 * Verify and decode an Access Token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: Expected access token');
  }
  return decoded;
}

/**
 * Verify and decode a Refresh Token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: Expected refresh token');
  }

  if (inMemoryRevokedJtis.has(decoded.jti)) {
    throw new Error('Refresh token has been revoked or replayed');
  }

  return decoded;
}

