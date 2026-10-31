import { UserRole } from '@prisma/client';

export const PERMISSIONS = [
  // User Management
  'users.read',
  'users.manage',

  // Staff Management (Admin Only)
  'staff.create',
  'staff.read',
  'staff.update',
  'staff.deactivate',

  // Product & Catalog Management
  'products.read',
  'products.manage',
  'plans.read',
  'plans.manage',

  // Quotations
  'quotations.read',
  'quotations.manage',

  // Subscriptions & Lifecycle
  'subscriptions.read',
  'subscriptions.manage',

  // Invoices & Billing
  'invoices.read',
  'invoices.manage',

  // Payments
  'payments.read',
  'payments.manage',

  // Taxes & Discounts (Restricted Admin Settings)
  'taxes.manage',
  'discounts.manage',

  // Reports & Financial Summaries
  'reports.read',

  // System Auditing & Settings
  'audit.read',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role-to-Permissions Mapping
 * Centralized RBAC definition enforcing principle of least privilege.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    'users.read',
    'users.manage',
    'staff.create',
    'staff.read',
    'staff.update',
    'staff.deactivate',
    'products.read',
    'products.manage',
    'plans.read',
    'plans.manage',
    'quotations.read',
    'quotations.manage',
    'subscriptions.read',
    'subscriptions.manage',
    'invoices.read',
    'invoices.manage',
    'payments.read',
    'payments.manage',
    'taxes.manage',
    'discounts.manage',
    'reports.read',
    'audit.read',
    'settings.manage',
  ],

  STAFF: [
    'users.read',
    'products.read',
    'plans.read',
    'quotations.read',
    'quotations.manage',
    'subscriptions.read',
    'subscriptions.manage',
    'invoices.read',
    'invoices.manage',
    'payments.read',
    'payments.manage',
    'reports.read',
  ],

  CUSTOMER: [
    // Customer permissions are strictly scoped to their own records on the backend
    'products.read',
    'plans.read',
    'quotations.read',
    'subscriptions.read',
    'invoices.read',
    'payments.read',
  ],
};

/**
 * Verify whether a role has been granted a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Verify whether a role has been granted ALL requested permissions.
 */
export function hasAllPermissions(role: UserRole, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every((perm) => hasPermission(role, perm));
}

/**
 * Return all permissions assigned to a given role.
 */
export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
