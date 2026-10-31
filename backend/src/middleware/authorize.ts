import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { Permission, hasAllPermissions, hasPermission } from '../config/permissions';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';

/**
 * Middleware factory requiring user to possess one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

/**
 * Middleware factory requiring user to possess all specified permissions.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admins always have comprehensive system permissions
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const hasAccess = hasAllPermissions(req.user.role, permissions);
    if (!hasAccess) {
      return next(
        new ForbiddenError(
          `Access forbidden: Missing required permission (${permissions.join(', ')})`
        )
      );
    }

    next();
  };
}

/**
 * Middleware enforcing customer data ownership at the backend level.
 * Prevents customers from accessing other customers' data by tampering with IDs.
 * Staff and Admins bypass ownership checks.
 */
export function requireCustomerOwnership(paramKey = 'customerId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admins and Staff can inspect any customer record within permitted operations
    if (req.user.role === 'ADMIN' || req.user.role === 'STAFF') {
      return next();
    }

    // Customers can only access their own resource
    const targetCustomerId = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];

    if (!targetCustomerId) {
      return next(new ForbiddenError('Customer identifier missing from request'));
    }

    const customerProfileId = req.user.customerProfileId;
    const userId = req.user.id;

    const isMatch = targetCustomerId === customerProfileId || targetCustomerId === userId;

    if (!isMatch) {
      return next(
        new ForbiddenError("Access forbidden: You cannot access or modify another customer's data")
      );
    }

    next();
  };
}
