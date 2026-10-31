import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { authenticate } from '../src/middleware/authenticate';
import { requireCustomerOwnership } from '../src/middleware/authorize';
import { errorHandler } from '../src/middleware/errorHandler';
import { prisma } from '../src/config/database';

describe('Auth Middleware, RBAC Guard & API Integration', () => {
  const app = createApp();

  // Create isolated express app to test customer ownership route cleanly
  const testApp = express();
  testApp.use(express.json());
  testApp.get(
    '/api/v1/customers/:customerId/invoices',
    authenticate,
    requireCustomerOwnership('customerId'),
    (req, res) => {
      res.json({ success: true, customerId: req.params.customerId });
    }
  );
  testApp.use(errorHandler);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/auth/me should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/authentication token is required/i);
  });

  it('GET /api/v1/auth/me should return 401 with malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me should return 200 with valid access token', async () => {
    const mockUser = {
      id: 'test-user-uuid',
      email: 'customer@brightloop.io',
      role: 'CUSTOMER' as const,
      isActive: true,
      customerProfile: {
        id: 'cust-profile-1',
        contactName: 'Jane Customer',
        companyName: 'Acme Corp',
      },
      staffProfile: null,
      createdAt: new Date(),
    };

    // Mock prisma call so unit test does not wait for offline postgres
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

    const token = generateAccessToken({
      userId: 'test-user-uuid',
      email: 'customer@brightloop.io',
      role: 'CUSTOMER',
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('test-user-uuid');
    expect(res.body.data.email).toBe('customer@brightloop.io');
    expect(res.body.data.role).toBe('CUSTOMER');
    expect(res.body.data.permissions).toContain('invoices.read');
  });

  it('POST /api/v1/staff should return 403 Forbidden when invoked by CUSTOMER', async () => {
    const customerToken = generateAccessToken({
      userId: 'cust-uuid',
      email: 'cust@brightloop.io',
      role: 'CUSTOMER',
    });

    const res = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        email: 'newstaff@brightloop.io',
        password: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('POST /api/v1/staff should return 403 Forbidden when invoked by STAFF (only Admin can create staff)', async () => {
    const staffToken = generateAccessToken({
      userId: 'staff-uuid',
      email: 'staff@brightloop.io',
      role: 'STAFF',
    });

    const res = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        email: 'anotherstaff@brightloop.io',
        password: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('Customer Ownership Guard: Customer can access their own resource', async () => {
    const myId = 'cust-123';
    const customerToken = generateAccessToken({
      userId: myId,
      email: 'cust@brightloop.io',
      role: 'CUSTOMER',
    });

    const res = await request(testApp)
      .get(`/api/v1/customers/${myId}/invoices`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Customer Ownership Guard: Customer CANNOT access another customer resource (Tampered ID)', async () => {
    const myId = 'cust-123';
    const otherCustomerId = 'victim-customer-999';

    const customerToken = generateAccessToken({
      userId: myId,
      email: 'attacker@brightloop.io',
      role: 'CUSTOMER',
    });

    const res = await request(testApp)
      .get(`/api/v1/customers/${otherCustomerId}/invoices`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot access or modify another customer/i);
  });

  it('Customer Ownership Guard: Admin can inspect any customer data', async () => {
    const targetCustomerId = 'any-customer-456';
    const adminToken = generateAccessToken({
      userId: 'admin-uuid',
      email: 'admin@brightloop.io',
      role: 'ADMIN',
    });

    const res = await request(testApp)
      .get(`/api/v1/customers/${targetCustomerId}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
