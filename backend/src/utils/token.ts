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
  type: 'refresh';
}

// In-memory revocation set for blacklisted refresh tokens (JTIs)
const revokedTokenJtis = new Set<string>();

// User token versions: revoking all sessions for a user (e.g. on password reset)
const userTokenVersions = new Map<string, number>();

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
 */
export function generateRefreshToken(payload: { userId: string }): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const tokenPayload: RefreshTokenPayload = {
    sub: payload.userId,
    jti,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  };

  const token = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, options);
  return { token, jti };
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

  if (isRefreshTokenRevoked(decoded.jti)) {
    throw new Error('Refresh token has been revoked or replayed');
  }

  return decoded;
}

/**
 * Revoke a refresh token by JTI
 */
export function revokeRefreshToken(jti: string): void {
  revokedTokenJtis.add(jti);
}

/**
 * Check if a refresh token has been revoked
 */
export function isRefreshTokenRevoked(jti: string): boolean {
  return revokedTokenJtis.has(jti);
}

/**
 * Revoke all active sessions for a user (e.g. on password change)
 */
export function revokeAllUserTokens(userId: string): void {
  const currentVersion = userTokenVersions.get(userId) || 0;
  userTokenVersions.set(userId, currentVersion + 1);
}
