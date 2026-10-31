import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { prisma } from '../src/config/database';
import { Prisma, BillingFrequency, UserRole } from '@prisma/client';

describe('Subscription Plans API & RBAC Suite', () => {
  const app = createApp();

  const adminToken = generateAccessToken({
    userId: 'admin-uuid-1',
    email: 'admin@brightloop.io',
    role: UserRole.ADMIN,
  });

  const staffToken = generateAccessToken({
    userId: 'staff-uuid-1',
    email: 'staff@brightloop.io',
    role: UserRole.STAFF,
  });

  const customerToken = generateAccessToken({
    userId: 'customer-uuid-1',
    email: 'customer@brightloop.io',
    role: UserRole.CUSTOMER,
  });

  const samplePlanId = 'plan-uuid-123';
  const mockPlan = {
    id: samplePlanId,
    name: 'Standard Cloud SaaS',
    description: 'Complete multi-user cloud workspace',
    price: new Prisma.Decimal('199.99'),
    billingFrequency: BillingFrequency.MONTHLY,
    intervalCount: 1,
    minimumQuantity: 5,
    availableFrom: new Date('2026-01-01T00:00:00Z'),
    availableUntil: new Date('2026-12-31T23:59:59Z'),
    allowAutoClose: false,
    allowEarlyClose: true,
    allowPause: true,
    allowRenewal: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    _count: {
      subscriptions: 0,
      quotationTemplates: 0,
    },
    quotationTemplates: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock prisma.user.findUnique so auth middleware resolves instantly without waiting for offline PostgreSQL
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      const id = args.where.id;
      if (id === 'admin-uuid-1') {
        return {
          id: 'admin-uuid-1',
          email: 'admin@brightloop.io',
          role: UserRole.ADMIN,
          isActive: true,
          customerProfile: null,
          staffProfile: null,
        } as any;
      }
      if (id === 'staff-uuid-1') {
        return {
          id: 'staff-uuid-1',
          email: 'staff@brightloop.io',
          role: UserRole.STAFF,
          isActive: true,
          customerProfile: null,
          staffProfile: { id: 'sp-1', department: 'Billing', title: 'Specialist' },
        } as any;
      }
      return {
        id: 'customer-uuid-1',
        email: 'customer@brightloop.io',
        role: UserRole.CUSTOMER,
        isActive: true,
        customerProfile: { id: 'cp-1', contactName: 'Alex Customer', companyName: 'Nexus' },
        staffProfile: null,
      } as any;
    });
  });

  // ---------------------------------------------------------------------------
  // 1. CREATE PLAN
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/plans', () => {
    it('allows Admin to create a complete subscription plan (HTTP 201)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
        return fn({
          subscriptionPlan: {
            create: vi.fn().mockResolvedValue(mockPlan),
            findUniqueOrThrow: vi.fn().mockResolvedValue(mockPlan),
          },
          quotationTemplate: {
            create: vi.fn().mockResolvedValue({ id: 'tpl-1' }),
          },
        });
      });

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Standard Cloud SaaS',
          description: 'Complete multi-user cloud workspace',
          price: '199.99',
          billingFrequency: 'MONTHLY',
          intervalCount: 1,
          minimumQuantity: 5,
          availableFrom: '2026-01-01T00:00:00.000Z',
          availableUntil: '2026-12-31T23:59:59.000Z',
          allowAutoClose: false,
          allowEarlyClose: true,
          allowPause: true,
          allowRenewal: true,
          isActive: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.name).toBe('Standard Cloud SaaS');
      expect(response.body.data.plan.price).toBe('199.99');
      expect(response.body.data.plan.minimumQuantity).toBe(5);
      expect(response.body.data.plan.billingFrequency).toBe('MONTHLY');
    });

    it('rejects plan creation when plan name is missing (HTTP 400)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: '99.00',
          billingFrequency: 'MONTHLY',
          availableFrom: '2026-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Plan name is mandatory');
    });

    it('rejects plan creation with negative price (HTTP 400)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Negative Plan',
          price: -50.0,
          billingFrequency: 'MONTHLY',
          availableFrom: '2026-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain('Price must be greater than or equal to 0');
    });

    it('rejects plan creation with invalid billing frequency (HTTP 400)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Frequency Plan',
          price: '100.00',
          billingFrequency: 'BI_WEEKLY', // Unsupported frequency!
          availableFrom: '2026-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain(
        'Billing frequency must be one of: DAILY, WEEKLY, MONTHLY, YEARLY'
      );
    });

    it('rejects plan when availableUntil precedes availableFrom (HTTP 400)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Inverted Dates Plan',
          price: '100.00',
          billingFrequency: 'MONTHLY',
          availableFrom: '2026-06-01T00:00:00Z',
          availableUntil: '2026-05-01T00:00:00Z', // Before start!
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(JSON.stringify(response.body)).toContain(
        'Availability end date cannot precede start date'
      );
    });

    it('rejects duplicate plan name (HTTP 409 Conflict)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findFirst').mockResolvedValue(mockPlan as any);

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Standard Cloud SaaS',
          price: '199.99',
          billingFrequency: 'MONTHLY',
          availableFrom: '2026-01-01T00:00:00Z',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('rejects plan creation with inactive associated product (HTTP 400)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([]); // Product not active/found

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bundle Plan',
          price: '299.99',
          billingFrequency: 'YEARLY',
          availableFrom: '2026-01-01T00:00:00Z',
          associatedProductIds: ['00000000-0000-0000-0000-000000000001'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inactive');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. LIST PLANS
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/plans', () => {
    it('returns paginated plans with server-side filters for Admin (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.subscriptionPlan, 'findMany').mockResolvedValue([mockPlan as any]);

      const response = await request(app)
        .get('/api/v1/plans?page=1&limit=10&billingFrequency=MONTHLY')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
      expect(response.body.data.plans[0].price).toBe('199.99');
    });

    it('allows Staff to list plans (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.subscriptionPlan, 'findMany').mockResolvedValue([mockPlan as any]);

      const response = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('scopes Customer queries to active and available plans only', async () => {
      const findManySpy = vi
        .spyOn(prisma.subscriptionPlan, 'findMany')
        .mockResolvedValue([mockPlan as any]);
      vi.spyOn(prisma.subscriptionPlan, 'count').mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      // Verify where clause enforced isActive: true
      const callArgs = findManySpy.mock.calls[0][0];
      expect(callArgs?.where?.isActive).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GET PLAN BY ID
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/plans/:id', () => {
    it('retrieves plan details by ID (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan as any);

      const response = await request(app)
        .get(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.plan.id).toBe(samplePlanId);
      expect(response.body.data.plan.name).toBe('Standard Cloud SaaS');
    });

    it('returns 404 when plan does not exist', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/plans/non-existent-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 for Customer when plan is inactive or expired', async () => {
      const inactivePlan = { ...mockPlan, isActive: false };
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(inactivePlan as any);

      const response = await request(app)
        .get(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. UPDATE PLAN
  // ---------------------------------------------------------------------------
  describe('PATCH /api/v1/plans/:id', () => {
    it('allows Admin to update plan fields (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan as any);
      vi.spyOn(prisma.subscriptionPlan, 'findFirst').mockResolvedValue(null);

      const updatedPlan = {
        ...mockPlan,
        name: 'Enterprise Cloud SaaS',
        price: new Prisma.Decimal('299.99'),
        minimumQuantity: 10,
      };
      vi.spyOn(prisma.subscriptionPlan, 'update').mockResolvedValue(updatedPlan as any);

      const response = await request(app)
        .patch(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Cloud SaaS',
          price: '299.99',
          minimumQuantity: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.plan.name).toBe('Enterprise Cloud SaaS');
      expect(response.body.data.plan.price).toBe('299.99');
      expect(response.body.data.plan.minimumQuantity).toBe(10);
    });

    it('preserves historical subscriptions and quotations when updating plan price', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan as any);
      vi.spyOn(prisma.subscriptionPlan, 'update').mockResolvedValue({
        ...mockPlan,
        price: new Prisma.Decimal('350.00'),
      } as any);

      const response = await request(app)
        .patch(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: '350.00',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.plan.price).toBe('350.00');
      // Verifies only the subscriptionPlan record was targeted
      expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: samplePlanId },
          data: expect.objectContaining({ price: expect.any(Prisma.Decimal) }),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. ACTIVATE AND DEACTIVATE PLAN
  // ---------------------------------------------------------------------------
  describe('PATCH /api/v1/plans/:id/status', () => {
    it('allows Admin to deactivate a plan safely without deleting records (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan as any);
      vi.spyOn(prisma.subscriptionPlan, 'update').mockResolvedValue({
        ...mockPlan,
        isActive: false,
      } as any);

      const response = await request(app)
        .patch(`/api/v1/plans/${samplePlanId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.data.plan.isActive).toBe(false);
      expect(response.body.message).toContain('deactivated successfully');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. DELETE PLAN & REFERENCE SAFETY
  // ---------------------------------------------------------------------------
  describe('DELETE /api/v1/plans/:id', () => {
    it('allows Admin to delete an unreferenced plan (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue({
        ...mockPlan,
        _count: { subscriptions: 0, quotations: 0, quotationTemplates: 0 },
      } as any);
      vi.spyOn(prisma.subscriptionPlan, 'delete').mockResolvedValue(mockPlan as any);

      const response = await request(app)
        .delete(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully deleted');
    });

    it('rejects deletion of a plan referenced by existing subscriptions (HTTP 409 Conflict)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue({
        ...mockPlan,
        _count: { subscriptions: 3, quotations: 0, quotationTemplates: 1 },
      } as any);

      const response = await request(app)
        .delete(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('referenced by existing business records');
      expect(response.body.message).toContain('deactivate the plan instead');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. QUANTITY VALIDATION UTILITY
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/plans/:id/validate-quantity', () => {
    it('validates compliant quantity successfully (HTTP 200)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan as any);

      const response = await request(app)
        .post(`/api/v1/plans/${samplePlanId}/validate-quantity`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.validation.isValid).toBe(true);
      expect(response.body.data.validation.requestedQuantity).toBe(10);
      expect(response.body.data.validation.minimumQuantity).toBe(5);
    });

    it('rejects quantity below minimum quantity (HTTP 200 with isValid: false)', async () => {
      vi.spyOn(prisma.subscriptionPlan, 'findUnique').mockResolvedValue(mockPlan as any);

      const response = await request(app)
        .post(`/api/v1/plans/${samplePlanId}/validate-quantity`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.validation.isValid).toBe(false);
      expect(response.body.data.validation.error).toContain('is below the plan minimum');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. NEXT BILLING DATE CALCULATION ENDPOINT
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/plans/next-billing-date', () => {
    it('calculates next billing date accurately (HTTP 200)', async () => {
      const response = await request(app)
        .post('/api/v1/plans/next-billing-date')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          startDate: '2026-01-31T00:00:00.000Z',
          billingFrequency: 'MONTHLY',
          intervalCount: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.periodStart).toBe('2026-01-31T00:00:00.000Z');
      expect(response.body.data.nextBillingDate).toBe('2026-02-28T00:00:00.000Z'); // Feb 2026 has 28 days
    });
  });

  // ---------------------------------------------------------------------------
  // 9. RBAC PERMISSIONS ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe('RBAC Security & Role Boundaries', () => {
    it('forbids Staff from creating a plan (HTTP 403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Staff Plan',
          price: '50.00',
          billingFrequency: 'MONTHLY',
          availableFrom: '2026-01-01',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access forbidden');
    });

    it('forbids Staff from updating a plan (HTTP 403 Forbidden)', async () => {
      const response = await request(app)
        .patch(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ price: '120.00' });

      expect(response.status).toBe(403);
    });

    it('forbids Staff from deleting a plan (HTTP 403 Forbidden)', async () => {
      const response = await request(app)
        .delete(`/api/v1/plans/${samplePlanId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
    });

    it('forbids Customer from creating a plan (HTTP 403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Customer Plan',
          price: '10.00',
          billingFrequency: 'MONTHLY',
          availableFrom: '2026-01-01',
        });

      expect(response.status).toBe(403);
    });

    it('rejects unauthenticated requests (HTTP 401 Unauthorized)', async () => {
      const response = await request(app).get('/api/v1/plans');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Authentication token is required');
    });
  });
});
