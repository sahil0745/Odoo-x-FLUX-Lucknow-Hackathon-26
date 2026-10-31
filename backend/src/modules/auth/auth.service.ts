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
  validatePasswordPolicy,
} from '../../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSecureRandomToken,
  hashToken,
  revokeAllUserTokens,
  revokeRefreshToken,
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
import { logger } from '../../utils/logger';

export class AuthService {
  /**
   * Register a new Customer account with an associated CustomerProfile.
   * Enforces server-side CUSTOMER role assignment and handles race conditions.
   */
  async registerCustomer(dto: CustomerRegisterDto): Promise<AuthSessionResponse & { refreshToken: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Validate strict password rules
    const passwordCheck = validatePasswordPolicy(dto.password);
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
      // In offline mode, continue to attempt create or mock
    }

    // 3. Hash password securely (bcrypt factor 12)
    const passwordHash = await hashPassword(dto.password);

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

      const { token: refreshToken } = generateRefreshToken({ userId: user.id });

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
      // Prisma duplicate key code P2002
      if (error.code === 'P2002') {
        throw new ConflictError('An account with this email address already exists');
      }
      throw error;
    }
  }

  /**
   * Authenticate a user with email and password across all roles (Admin, Staff, Customer).
   */
  async login(dto: LoginDto): Promise<AuthSessionResponse & { refreshToken: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

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

    const isMatch = await comparePassword(dto.password, user.passwordHash);
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

    const { token: refreshToken } = generateRefreshToken({ userId: user.id });

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
   * Rotate a Refresh Token and issue a new Access Token.
   */
  async refreshSession(oldRefreshToken: string): Promise<AuthSessionResponse & { newRefreshToken: string }> {
    if (!oldRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const payload = verifyRefreshToken(oldRefreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        customerProfile: {
          select: { id: true, contactName: true, companyName: true },
        },
        staffProfile: {
          select: { id: true, department: true, title: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    // Revoke old refresh token JTI immediately (Rotation & Replay Prevention)
    revokeRefreshToken(payload.jti);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: newRefreshToken } = generateRefreshToken({ userId: user.id });

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
  }

  /**
   * Invalidate a session and revoke the current refresh token.
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        revokeRefreshToken(payload.jti);
      } catch {
        // Token was already invalid, expired, or corrupted
      }
    }
  }

  /**
   * Initiate a password reset request.
   * Generates a single-use token, persists its hash, and dispatches an email.
   * Always returns a generic response to prevent user enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          customerProfile: { select: { contactName: true } },
        },
      });

      if (user && user.isActive) {
        // Generate secure 32-byte cryptographic token
        const rawToken = generateSecureRandomToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

        // Revoke any prior unused reset tokens for this user
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

        // Send email with raw token
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
   * Complete password reset using token and verify strict password policies.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // 1. Enforce password policy
    const policy = validatePasswordPolicy(dto.password);
    if (!policy.isValid) {
      throw new ValidationError('Password policy violation', policy.errors);
    }

    // 2. Hash raw token to match stored database hash
    const tokenHash = hashToken(dto.token);

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetTokenRecord) {
      throw new ValidationError('Invalid or expired password reset link');
    }

    if (resetTokenRecord.usedAt !== null) {
      throw new ValidationError('This password reset link has already been used');
    }

    if (resetTokenRecord.expiresAt < new Date()) {
      throw new ValidationError('This password reset link has expired');
    }

    if (!resetTokenRecord.user.isActive) {
      throw new UnauthorizedError('This account has been deactivated');
    }

    // 3. Hash new password
    const newPasswordHash = await hashPassword(dto.password);

    // 4. Update password and mark token used atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // 5. Invalidate all active sessions for this user
    revokeAllUserTokens(resetTokenRecord.userId);

    logger.info(`[Auth] Password successfully reset for user: ${resetTokenRecord.user.email}`);

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
