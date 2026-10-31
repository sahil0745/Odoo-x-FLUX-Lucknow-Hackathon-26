import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAllPermissions,
  getPermissionsForRole,
  ROLE_PERMISSIONS,
} from '../src/config/permissions';

describe('RBAC Matrix & Permission Enforcement', () => {
  it('should grant ADMIN all system capabilities', () => {
    const adminPermissions = getPermissionsForRole('ADMIN');

    expect(adminPermissions).toContain('staff.create');
    expect(adminPermissions).toContain('staff.deactivate');
    expect(adminPermissions).toContain('taxes.manage');
    expect(adminPermissions).toContain('discounts.manage');
    expect(adminPermissions).toContain('audit.read');
    expect(adminPermissions).toContain('settings.manage');

    expect(hasPermission('ADMIN', 'staff.create')).toBe(true);
    expect(hasPermission('ADMIN', 'settings.manage')).toBe(true);
  });

  it('should restrict STAFF from administrative and security operations', () => {
    const staffPermissions = getPermissionsForRole('STAFF');

    // Permitted operational capabilities
    expect(staffPermissions).toContain('quotations.read');
    expect(staffPermissions).toContain('quotations.manage');
    expect(staffPermissions).toContain('subscriptions.read');
    expect(staffPermissions).toContain('invoices.read');
    expect(staffPermissions).toContain('payments.read');

    // Strictly FORBIDDEN capabilities
    expect(hasPermission('STAFF', 'staff.create')).toBe(false);
    expect(hasPermission('STAFF', 'staff.deactivate')).toBe(false);
    expect(hasPermission('STAFF', 'taxes.manage')).toBe(false);
    expect(hasPermission('STAFF', 'discounts.manage')).toBe(false);
    expect(hasPermission('STAFF', 'settings.manage')).toBe(false);
    expect(hasPermission('STAFF', 'audit.read')).toBe(false);
  });

  it('should scope CUSTOMER strictly to self-service resources', () => {
    const customerPermissions = getPermissionsForRole('CUSTOMER');

    expect(customerPermissions).toContain('quotations.read');
    expect(customerPermissions).toContain('subscriptions.read');
    expect(customerPermissions).toContain('invoices.read');
    expect(customerPermissions).toContain('payments.read');

    // Forbidden from managing quotes, creating staff, or administering settings
    expect(hasPermission('CUSTOMER', 'quotations.manage')).toBe(false);
    expect(hasPermission('CUSTOMER', 'staff.create')).toBe(false);
    expect(hasPermission('CUSTOMER', 'invoices.manage')).toBe(false);
    expect(hasPermission('CUSTOMER', 'settings.manage')).toBe(false);
  });

  it('should correctly evaluate hasAllPermissions composite check', () => {
    expect(hasAllPermissions('ADMIN', ['staff.create', 'invoices.manage'])).toBe(true);
    expect(hasAllPermissions('STAFF', ['quotations.manage', 'invoices.manage'])).toBe(true);
    expect(hasAllPermissions('STAFF', ['quotations.manage', 'staff.create'])).toBe(false);
  });
});
