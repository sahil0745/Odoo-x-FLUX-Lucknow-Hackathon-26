import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateStaffDto, UpdateStaffDto } from './staff.types';
import { hashPassword, validatePasswordPolicy } from '../../utils/password';
import { revokeAllUserTokens } from '../../utils/token';
import { getSessionStore } from '../auth/session.store';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class StaffService {
  /**
   * Provision a new Internal Staff account (Admin only).
   */
  async createStaff(adminUserId: string, dto: CreateStaffDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const policy = validatePasswordPolicy(dto.password);
    if (!policy.isValid) {
      throw new ValidationError('Password policy violation', policy.errors);
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new ConflictError('An account with this email address already exists');
      }
    } catch (err) {
      if (err instanceof ConflictError) throw err;
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const staffUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: UserRole.STAFF, // Strictly STAFF role
          isActive: true,
          staffProfile: {
            create: {
              department: dto.department?.trim() || 'Operations',
              title: dto.title?.trim() || 'Internal Staff Member',
              createdById: adminUserId,
            },
          },
        },
        include: {
          staffProfile: true,
        },
      });

      logger.info(`[Staff] Admin ${adminUserId} provisioned staff account: ${staffUser.email}`);

      return {
        id: staffUser.id,
        email: staffUser.email,
        role: staffUser.role,
        isActive: staffUser.isActive,
        staffProfile: staffUser.staffProfile,
        createdAt: staffUser.createdAt,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictError('An account with this email address already exists');
      }
      throw error;
    }
  }

  /**
   * Retrieve all staff accounts with their profiles.
   */
  async listStaff() {
    const staffMembers = await prisma.user.findMany({
      where: { role: UserRole.STAFF },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        staffProfile: {
          select: {
            id: true,
            department: true,
            title: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return staffMembers;
  }

  /**
   * Retrieve a single staff account by user ID.
   */
  async getStaffById(staffUserId: string) {
    const staff = await prisma.user.findFirst({
      where: {
        id: staffUserId,
        role: UserRole.STAFF,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        staffProfile: {
          select: {
            id: true,
            department: true,
            title: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundError('Staff account not found');
    }

    return staff;
  }

  /**
   * Update staff profile attributes (department, title).
   */
  async updateStaff(staffUserId: string, dto: UpdateStaffDto) {
    const staff = await prisma.user.findFirst({
      where: { id: staffUserId, role: UserRole.STAFF },
      include: { staffProfile: true },
    });

    if (!staff || !staff.staffProfile) {
      throw new NotFoundError('Staff account not found');
    }

    const updatedProfile = await prisma.staffProfile.update({
      where: { userId: staffUserId },
      data: {
        department: dto.department !== undefined ? dto.department.trim() : staff.staffProfile.department,
        title: dto.title !== undefined ? dto.title.trim() : staff.staffProfile.title,
      },
    });

    return {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      staffProfile: updatedProfile,
    };
  }

  /**
   * Activate or deactivate a staff account.
   */
  async updateStaffStatus(adminUserId: string, staffUserId: string, isActive: boolean) {
    if (adminUserId === staffUserId) {
      throw new ValidationError('You cannot modify your own administrative account status');
    }

    const staff = await prisma.user.findFirst({
      where: { id: staffUserId, role: UserRole.STAFF },
    });

    if (!staff) {
      throw new NotFoundError('Staff account not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: staffUserId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // If deactivated, revoke all active sessions immediately
    if (!isActive) {
      revokeAllUserTokens(staffUserId);
      await getSessionStore().revokeAllUserSessions(staffUserId);
      logger.info(`[Staff] Staff account ${staff.email} deactivated. Sessions revoked.`);
    } else {
      logger.info(`[Staff] Staff account ${staff.email} reactivated.`);
    }

    return updatedUser;
  }
}

export const staffService = new StaffService();
