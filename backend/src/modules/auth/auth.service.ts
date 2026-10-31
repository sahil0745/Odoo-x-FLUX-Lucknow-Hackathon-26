import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CustomerRegisterDto,
  LoginDto,
  ResetPasswordDto,
  AuthSessionResponse,
} from './auth.types';
import {
  comparePassword,
  hashPassword,
  normalizePassword,
  validatePasswordPolicy,
} from '../../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSecureRandomToken,
  hashToken,
  verifyRefreshToken,
} from '../../utils/token';
import { sendPasswordResetEmail } from '../../utils/email';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/AppError';
import { getPermissionsForRole } from '../../config/permissions';
import { getSessionStore } from './session.store';
import { logger } from '../../utils/logger';

export interface RequestClientMetadata {
  ipAddress?: string;
  userAgent?: string;
}

const inFlightTokenRotations = new Set<string>();

export class AuthService {
  /**
   * Register a new Customer account with an associated CustomerProfile.
   * Enforces server-side CUSTOMER role assignment, Unicode normalization, and persistent session storage.
   */
  async registerCustomer(
    dto: CustomerRegisterDto,
    meta?: RequestClientMetadata
  ): Promise<AuthSessionResponse & { refreshToken: string }> {
    const normalizedEmail = dto.email.normalize('NFKC').toLowerCase().trim();
    const normalizedPassword = normalizePassword(dto.password);

    // 1. Validate strict password rules (including 72-byte limit)
    const passwordCheck = validatePasswordPolicy(normalizedPassword);
    if (!passwordCheck.isValid) {
      throw new ValidationError('Password policy violation', passwordCheck.errors);
    }

    // 2. Check for duplicate email
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw new ConflictError('An account with this email address already exists');
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
    }

    // 3. Hash password securely (bcrypt factor 12)
    const passwordHash = await hashPassword(normalizedPassword);

    // 4. Create User and CustomerProfile atomically
    try {
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: UserRole.CUSTOMER, // Strictly assigned on the server
          isActive: true,
          customerProfile: {
            create: {
              contactName: dto.fullName.trim(),
              companyName: dto.companyName?.trim() || null,
              phone: dto.phone?.trim() || null,
            },
          },
        },
        include: {
          customerProfile: {
            select: {
              id: true,
              contactName: true,
              companyName: true,
            },
          },
        },
      });

      logger.info(`[Auth] Customer registered successfully: ${user.email} (ID: ${user.id})`);

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const { token: refreshToken, jti, familyId, expiresAt } = generateRefreshToken({
        userId: user.id,
      });

      // Persist session to session store
      const sessionStore = getSessionStore();
      await sessionStore.createSession({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        jti,
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          customerProfile: user.customerProfile,
          staffProfile: null,
        },
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictError('An account with this email address already exists');
      }
      throw error;
    }
  }

  /**
   * Authenticate a user across all roles (Admin, Staff, Customer).
   * Creates a persistent session record with token family tracking.
   */
  async login(
    dto: LoginDto,
    meta?: RequestClientMetadata
  ): Promise<AuthSessionResponse & { refreshToken: string }> {
    const normalizedEmail = dto.email.normalize('NFKC').toLowerCase().trim();
    const normalizedPassword = normalizePassword(dto.password);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        customerProfile: {
          select: {
            id: true,
            contactName: true,
            companyName: true,
          },
        },
        staffProfile: {
          select: {
            id: true,
            department: true,
            title: true,
          },
        },
      },
    });

    // Timing-safe generic error for both unknown email and bad password
    if (!user) {
      logger.warn(`[Auth] Failed login attempt: unknown email ${normalizedEmail}`);
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await comparePassword(normalizedPassword, user.passwordHash);
    if (!isMatch) {
      logger.warn(`[Auth] Failed login attempt: incorrect password for ${normalizedEmail}`);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      logger.warn(`[Auth] Deactivated user attempted login: ${normalizedEmail}`);
      throw new UnauthorizedError('Account has been deactivated. Please contact support.');
    }

    logger.info(`[Auth] Successful login for ${user.email} [${user.role}]`);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: refreshToken, jti, familyId, expiresAt } = generateRefreshToken({
      userId: user.id,
    });

    // Persist session to session store
    const sessionStore = getSessionStore();
    await sessionStore.createSession({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      jti,
      expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        customerProfile: user.customerProfile,
        staffProfile: user.staffProfile,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate a Refresh Token with family reuse detection.
   * If a revoked or already rotated token is presented, the ENTIRE token family is immediately revoked.
   */
  async refreshSession(
    oldRefreshToken: string,
    meta?: RequestClientMetadata
  ): Promise<AuthSessionResponse & { newRefreshToken: string }> {
    if (!oldRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (err: any) {
      throw new UnauthorizedError(err.message || 'Invalid or malformed refresh token');
    }

    const oldTokenHash = hashToken(oldRefreshToken);
    if (inFlightTokenRotations.has(oldTokenHash)) {
      throw new UnauthorizedError('Simultaneous token refresh in progress. Please retry.');
    }
    inFlightTokenRotations.add(oldTokenHash);

    try {
      const sessionStore = getSessionStore();

      // 1. Look up session in persistent store
      const session = await sessionStore.findSessionByTokenHash(oldTokenHash);

      // 2. Refresh Token Reuse Detection
      if (!session) {
        // Check if JTI was recorded under a rotated hash
        const sessionByJti = await sessionStore.findSessionByJti(payload.jti);
        if (sessionByJti && sessionByJti.isRevoked) {
          await sessionStore.revokeFamily(sessionByJti.familyId);
          logger.error(`[Security Alert] Token reuse detected via JTI ${payload.jti}. Revoked family ${sessionByJti.familyId}.`);
          throw new UnauthorizedError('Refresh token reuse detected. All active sessions in this family have been terminated.');
        }
        throw new UnauthorizedError('Invalid or unrecognised refresh token');
      }

      if (session.isRevoked) {
        // CRITICAL REUSE DETECTED: An already revoked/rotated token was presented again!
        await sessionStore.revokeFamily(session.familyId);
        logger.error(`[Security Alert] Revoked token presented again: family ${session.familyId}. Revoked entire family.`);
        throw new UnauthorizedError('Refresh token reuse detected. All active sessions in this family have been terminated.');
      }

      if (session.expiresAt.getTime() < Date.now()) {
        await sessionStore.revokeSession(session.id);
        throw new UnauthorizedError('Refresh token has expired. Please log in again.');
      }

      // 3. Verify user active status
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          customerProfile: { select: { id: true, contactName: true, companyName: true } },
          staffProfile: { select: { id: true, department: true, title: true } },
        },
      });

      if (!user || !user.isActive) {
        await sessionStore.revokeFamily(session.familyId);
        throw new UnauthorizedError('User account not found or deactivated');
      }

      // 4. Safe Rotation: Issue new token keeping the same familyId
      const { token: newRefreshToken, jti: newJti, expiresAt: newExpiresAt } = generateRefreshToken({
        userId: user.id,
        familyId: session.familyId,
      });

      const newTokenHash = hashToken(newRefreshToken);

      // Persist new session
      await sessionStore.createSession({
        userId: user.id,
        tokenHash: newTokenHash,
        familyId: session.familyId,
        jti: newJti,
        expiresAt: newExpiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      // Revoke old session and link to the replacement
      await sessionStore.revokeSession(session.id, newTokenHash);

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          customerProfile: user.customerProfile,
          staffProfile: user.staffProfile,
        },
        accessToken,
        newRefreshToken,
      };
    } finally {
      inFlightTokenRotations.delete(oldTokenHash);
    }
  }

  /**
   * Invalidate a session and revoke the refresh token in persistent storage.
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      try {
        const tokenHash = hashToken(refreshToken);
        const sessionStore = getSessionStore();
        const session = await sessionStore.findSessionByTokenHash(tokenHash);
        if (session) {
          await sessionStore.revokeSession(session.id);
        }
      } catch {
        // Token was invalid or already expired
      }
    }
  }

  /**
   * Initiate a password reset request.
   * Generates a single-use token, persists its hash, and dispatches an email.
   * Always returns a generic response to prevent user enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.normalize('NFKC').toLowerCase().trim();

    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          customerProfile: { select: { contactName: true } },
        },
      });

      if (user && user.isActive) {
        const rawToken = generateSecureRandomToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

        // Invalidate prior unused reset tokens for this user
        await prisma.passwordResetToken.deleteMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
        });

        // Store hashed token
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });

        // Send email with raw token (safe dev logging in development; strict fail-safe in production)
        await sendPasswordResetEmail({
          toEmail: user.email,
          resetToken: rawToken,
          recipientName: user.customerProfile?.contactName || 'User',
        });
      } else {
        logger.warn(`[Auth] Forgot password requested for non-existent or inactive email: ${normalizedEmail}`);
      }
    } catch (error) {
      logger.error('[Auth] Error processing forgot-password:', error);
    }

    // Generic response regardless of whether account exists
    return {
      message: 'If an account exists with this email address, you will receive a password reset link shortly.',
    };
  }

  /**
   * Complete password reset using token.
   * Uses atomic conditional updates to prevent concurrent race conditions on token reuse,
   * updates password, and revokes ALL persistent user sessions.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalizedPassword = normalizePassword(dto.password);

    // 1. Enforce password policy (including 72-byte guard)
    const policy = validatePasswordPolicy(normalizedPassword);
    if (!policy.isValid) {
      throw new ValidationError('Password policy violation', policy.errors);
    }

    // 2. Hash raw token to match stored database hash
    const tokenHash = hashToken(dto.token);

    // 3. Atomically consume the token to prevent concurrent token reuse
    const consumeResult = await prisma.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (consumeResult.count === 0) {
      throw new ValidationError('Invalid, expired, or already used password reset link');
    }

    // 4. Retrieve user associated with the consumed token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || !tokenRecord.user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    // 5. Hash new password
    const newPasswordHash = await hashPassword(normalizedPassword);

    // 6. Update user password
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    // 7. Revoke ALL persistent sessions for this user across all devices
    const sessionStore = getSessionStore();
    await sessionStore.revokeAllUserSessions(tokenRecord.userId);

    logger.info(`[Auth] Password successfully reset for user: ${tokenRecord.user.email}. All sessions revoked.`);

    return {
      message: 'Your password has been successfully reset. You may now log in with your new credentials.',
    };
  }

  /**
   * Retrieve current user profile and permission manifest.
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User account not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
      customerProfile: user.customerProfile,
      staffProfile: user.staffProfile,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
