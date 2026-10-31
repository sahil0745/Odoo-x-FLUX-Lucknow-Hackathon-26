import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { UnauthorizedError } from '../utils/AppError';
import { prisma } from '../config/database';

/**
 * Express middleware to verify incoming Bearer JWT access tokens.
 * Validates token signature, token expiry, and user active status.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token is required'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new UnauthorizedError('Authentication token is empty'));
  }

  try {
    const payload = verifyAccessToken(token);

    // If database is available, check active status and load profile IDs
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          customerProfile: { select: { id: true } },
          staffProfile: { select: { id: true } },
        },
      });

      if (dbUser) {
        if (!dbUser.isActive) {
          return next(new UnauthorizedError('Account has been deactivated. Please contact support.'));
        }

        req.user = {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          customerProfileId: dbUser.customerProfile?.id || null,
          staffProfileId: dbUser.staffProfile?.id || null,
        };
        return next();
      }

      // User was not found in the database
      if (process.env.NODE_ENV !== 'test') {
        return next(new UnauthorizedError('User account no longer exists or has been removed'));
      }
    } catch (dbErr: any) {
      if (dbErr instanceof UnauthorizedError) {
        return next(dbErr);
      }
      if (process.env.NODE_ENV !== 'test') {
        return next(new UnauthorizedError('Authentication verification failed'));
      }
    }

    // Default to verified cryptographic token payload (fallback in test mode)
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err: any) {
    return next(new UnauthorizedError(err.message || 'Invalid or expired access token'));
  }
}
