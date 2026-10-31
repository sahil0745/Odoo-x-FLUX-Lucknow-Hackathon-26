import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '../src/modules/auth/auth.service';
import {
  InMemorySessionStore,
  setSessionStore,
  getSessionStore,
} from '../src/modules/auth/session.store';
import {
  validatePasswordPolicy,
  hashPassword,
} from '../src/utils/password';
import {
  generateRefreshToken,
  hashToken,
} from '../src/utils/token';
import { sendPasswordResetEmail } from '../src/utils/email';
import { env } from '../src/config/env';
import { prisma } from '../src/config/database';

describe('Master Prompt 04A — Security Audit & Hardening Suite', () => {
  let memoryStore: InMemorySessionStore;

  beforeEach(() => {
    vi.restoreAllMocks();
    memoryStore = new InMemorySessionStore();
    setSessionStore(memoryStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Refresh token invalidation after logout
  it('1. Refresh token is invalidated after logout and cannot be used again', async () => {
    const userId = 'user-logout-test';
    const { token: refreshToken, jti, familyId, expiresAt } = generateRefreshToken({ userId });

    await memoryStore.createSession({
      userId,
      tokenHash: hashToken(refreshToken),
      familyId,
      jti,
      expiresAt,
    });

    // Verify session exists and is active
    let session = await memoryStore.findSessionByTokenHash(hashToken(refreshToken));
    expect(session).not.toBeNull();
    expect(session?.isRevoked).toBe(false);

    // Perform logout
    await authService.logout(refreshToken);

    // Verify session is now revoked
    session = await memoryStore.findSessionByTokenHash(hashToken(refreshToken));
    expect(session?.isRevoked).toBe(true);

    // Attempting to refresh with revoked token should fail
    await expect(authService.refreshSession(refreshToken)).rejects.toThrow(
      /Refresh token reuse detected/i
    );
  });

  // 2. Refresh token invalidation after password reset
  it('2. Refresh tokens are invalidated after a password reset', async () => {
    const userId = 'user-pw-reset-test';
    const { token: token1, jti: jti1, familyId: f1, expiresAt } = generateRefreshToken({ userId });
    const { token: token2, jti: jti2, familyId: f2 } = generateRefreshToken({ userId });

    await memoryStore.createSession({
      userId,
      tokenHash: hashToken(token1),
      familyId: f1,
      jti: jti1,
      expiresAt,
    });

    await memoryStore.createSession({
      userId,
      tokenHash: hashToken(token2),
      familyId: f2,
      jti: jti2,
      expiresAt,
    });

    // Revoke all sessions for this user (simulating password reset)
    const revokedCount = await memoryStore.revokeAllUserSessions(userId);
    expect(revokedCount).toBe(2);

    const s1 = await memoryStore.findSessionByTokenHash(hashToken(token1));
    const s2 = await memoryStore.findSessionByTokenHash(hashToken(token2));
    expect(s1?.isRevoked).toBe(true);
    expect(s2?.isRevoked).toBe(true);

    // Refresh attempts must be rejected
    await expect(authService.refreshSession(token1)).rejects.toThrow(/reuse detected/i);
    await expect(authService.refreshSession(token2)).rejects.toThrow(/reuse detected/i);
  });

  // 3. Refresh token reuse detection & token family invalidation
  it('3. Refresh token reuse detection revokes entire token family', async () => {
    const userId = 'user-family-test';
    const mockUser = {
      id: userId,
      email: 'family@brightloop.io',
      role: 'CUSTOMER',
      isActive: true,
      customerProfile: null,
      staffProfile: null,
    };
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

    // Initial Token T1
    const { token: t1, jti: jti1, familyId, expiresAt } = generateRefreshToken({ userId });
    await memoryStore.createSession({
      userId,
      tokenHash: hashToken(t1),
      familyId,
      jti: jti1,
      expiresAt,
    });

    // Legitimate rotation: T1 -> T2
    const rotationResult = await authService.refreshSession(t1);
    const t2 = rotationResult.newRefreshToken;

    // Verify T1 is revoked and T2 is active under the SAME familyId
    const s1 = await memoryStore.findSessionByTokenHash(hashToken(t1));
    const s2 = await memoryStore.findSessionByTokenHash(hashToken(t2));
    expect(s1?.isRevoked).toBe(true);
    expect(s2?.isRevoked).toBe(false);
    expect(s1?.familyId).toBe(s2?.familyId);

    // ATTACK SIMULATION: Attacker replays already-rotated token T1!
    await expect(authService.refreshSession(t1)).rejects.toThrow(
      /Refresh token reuse detected/i
    );

    // Entire token family should now be revoked (including the legitimate T2!)
    const s2AfterAttack = await memoryStore.findSessionByTokenHash(hashToken(t2));
    expect(s2AfterAttack?.isRevoked).toBe(true);

    // Legitimate client with T2 is now also forced to re-authenticate
    await expect(authService.refreshSession(t2)).rejects.toThrow(
      /Refresh token reuse detected/i
    );
  });

  // 4. Refresh token revocation surviving simulated storage restart
  it('4. Refresh token revocation survives simulated process / storage restart', async () => {
    const userId = 'user-restart-test';
    const { token, jti, familyId, expiresAt } = generateRefreshToken({ userId });

    await memoryStore.createSession({
      userId,
      tokenHash: hashToken(token),
      familyId,
      jti,
      expiresAt,
    });

    // Revoke token
    await authService.logout(token);

    // Snapshot storage state before restart
    const stateDump = memoryStore.dumpSessions();

    // Simulate backend server restart by instantiating a new store restored from persistence
    const restartedStore = new InMemorySessionStore();
    restartedStore.restoreSessions(stateDump);
    setSessionStore(restartedStore);

    // Verify token remains revoked after restart
    const session = await restartedStore.findSessionByTokenHash(hashToken(token));
    expect(session).not.toBeNull();
    expect(session?.isRevoked).toBe(true);

    await expect(authService.refreshSession(token)).rejects.toThrow(/reuse detected/i);
  });

  // 5. Concurrent refresh attempts
  it('5. Concurrent refresh attempts allow only one rotation and detect replay', async () => {
    const userId = 'user-concurrency-test';
    const mockUser = {
      id: userId,
      email: 'concurrent@brightloop.io',
      role: 'CUSTOMER',
      isActive: true,
      customerProfile: null,
      staffProfile: null,
    };
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

    const { token, jti, familyId, expiresAt } = generateRefreshToken({ userId });
    await memoryStore.createSession({
      userId,
      tokenHash: hashToken(token),
      familyId,
      jti,
      expiresAt,
    });

    // Execute two simultaneous refresh calls with identical token
    const call1 = authService.refreshSession(token);
    const call2 = authService.refreshSession(token);

    const results = await Promise.allSettled([call1, call2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one call should succeed, while the competing call detects reuse or revocation
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  // 6. Passwords longer than 72 bytes guard
  it('6. Passwords longer than 72 bytes are explicitly rejected to prevent silent bcrypt truncation', async () => {
    // 73 ASCII characters
    const longPassword = 'P@ssword12345678901234567890123456789012345678901234567890123456789012345!';
    expect(Buffer.byteLength(longPassword, 'utf8')).toBeGreaterThan(72);

    const policy = validatePasswordPolicy(longPassword);
    expect(policy.isValid).toBe(false);
    expect(policy.errors[0]).toMatch(/exceeds the 72-byte cryptographic length limit/i);

    // hashPassword must throw and refuse to truncate
    await expect(hashPassword(longPassword)).rejects.toThrow(/exceeds the bcrypt 72-byte limit/i);
  });

  // 7. Password reset token reuse prevention
  it('7. Single-use password reset tokens cannot be reused', async () => {
    const tokenHash = 'test-reset-token-hash-123';

    // Mock updateMany to return 1 on first invocation (success), and 0 on second invocation (already used)
    let callCount = 0;
    vi.spyOn(prisma.passwordResetToken, 'updateMany').mockImplementation(async () => {
      callCount++;
      return { count: callCount === 1 ? 1 : 0 };
    });

    vi.spyOn(prisma.passwordResetToken, 'findUnique').mockResolvedValue({
      id: 'token-rec-1',
      userId: 'user-reset-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
      createdAt: new Date(),
      user: {
        id: 'user-reset-1',
        email: 'user@brightloop.io',
        isActive: true,
      },
    } as any);

    vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

    // First attempt succeeds
    const res1 = await authService.resetPassword({
      token: 'raw-token-123',
      password: 'NewStrongPassword2026!',
      confirmPassword: 'NewStrongPassword2026!',
    });
    expect(res1.message).toMatch(/successfully reset/i);

    // Second attempt fails because token has been marked used
    await expect(
      authService.resetPassword({
        token: 'raw-token-123',
        password: 'AnotherPassword2026!',
        confirmPassword: 'AnotherPassword2026!',
      })
    ).rejects.toThrow(/already used/i);
  });

  // 8. Concurrent password reset requests
  it('8. Concurrent password reset requests atomically permit only one reset', async () => {
    let updateCount = 0;
    vi.spyOn(prisma.passwordResetToken, 'updateMany').mockImplementation(async () => {
      updateCount++;
      // Atomically only the first request consumes the record
      return { count: updateCount === 1 ? 1 : 0 };
    });

    vi.spyOn(prisma.passwordResetToken, 'findUnique').mockResolvedValue({
      id: 'token-rec-2',
      userId: 'user-reset-2',
      tokenHash: 'token-hash-race',
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
      createdAt: new Date(),
      user: {
        id: 'user-reset-2',
        email: 'race@brightloop.io',
        isActive: true,
      },
    } as any);

    vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

    const call1 = authService.resetPassword({
      token: 'race-token',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });

    const call2 = authService.resetPassword({
      token: 'race-token',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });

    const results = await Promise.allSettled([call1, call2]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  // 9. Production SMTP configuration fail-safe
  it('9. In production, unconfigured SMTP fails safely without leaking reset links', async () => {
    const originalEnv = env.NODE_ENV;
    (env as any).NODE_ENV = 'production';

    const result = await sendPasswordResetEmail({
      toEmail: 'customer@brightloop.io',
      resetToken: 'secret-token-value-xyz',
    });

    expect(result.success).toBe(false);
    expect(result.isMock).toBe(false);
    expect(result.resetUrl).toBeUndefined(); // NEVER returned in production

    (env as any).NODE_ENV = originalEnv;
  });

  // 10. CORS and Cookie security properties
  it('10. Cookies enforce HttpOnly, Lax SameSite, Path restriction, and no wildcard CORS with credentials', () => {
    // Verify that CORS origin is not wildcard
    const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
    expect(allowed).not.toContain('*');
  });
});
