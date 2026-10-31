import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { prisma } from '../src/config/database';
import { ProductType, BillingFrequency, Prisma } from '@prisma/client';

describe('Products & Subscription Plans (M02 & M03) Test Suite', () => {
  const app = createApp();

  const adminToken = generateAccessToken({
    userId: 'admin-user-uuid',
    email: 'admin@brightloop.io',
    role: 'ADMIN',
  });

  const staffToken = generateAccessToken({
    userId: 'staff-user-uuid',
    email: 'staff@brightloop.io',
    role: 'STAFF',
  });

  const customerToken = generateAccessToken({
    userId: 'customer-user-uuid',
    email: 'customer@brightloop.io',
    role: 'CUSTOMER',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Product Management (M02)', () => {
    it('GET /api/v1/products should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/products should return 200 for authenticated CUSTOMER with computed margin', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Brightloop ERP Core',
        type: ProductType.SOFTWARE,
        salesPrice: new Prisma.Decimal('1000.00'),
        costPrice: new Prisma.Decimal('400.00'),
        notes: 'Core enterprise software package',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            productId: 'prod-123',
            variantType: 'Brand',
            variantValue: 'Odoo',
            additionalPrice: new Prisma.Decimal('560.00'),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProduct as any]);

      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].salesPrice).toBe(1000);
      expect(res.body.data[0].costPrice).toBe(400);
      expect(res.body.data[0].marginPercent).toBe(60);
      expect(res.body.data[0].variants[0].additionalPrice).toBe(560);
      expect(res.body.data[0].variants[0].effectivePrice).toBe(1560);
    });

    it('POST /api/v1/products should return 403 Forbidden when invoked by STAFF', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Module',
          type: ProductType.SOFTWARE,
          salesPrice: 200,
          costPrice: 50,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('POST /api/v1/products should return 400 when sales price is negative', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Negative Price Item',
          type: ProductType.SOFTWARE,
          salesPrice: -50,
          costPrice: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/products should return 201 Created for ADMIN with valid payload', async () => {
      const createdProduct = {
        id: 'prod-999',
        name: 'Analytics Suite',
        type: ProductType.SERVICE,
        salesPrice: new Prisma.Decimal('500.00'),
        costPrice: new Prisma.Decimal('150.00'),
        notes: 'BI and reporting service module',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      };

      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.product, 'create').mockResolvedValue(createdProduct as any);

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Analytics Suite',
          type: 'SERVICE',
          salesPrice: 500.0,
          costPrice: 150.0,
          notes: 'BI and reporting service module',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Analytics Suite');
      expect(res.body.data.salesPrice).toBe(500);
      expect(res.body.data.marginPercent).toBe(70);
    });

    it('POST /api/v1/products/:productId/variants should enforce unique constraint', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Brightloop ERP Core',
        salesPrice: new Prisma.Decimal('1000.00'),
        costPrice: new Prisma.Decimal('400.00'),
        variants: [],
      };

      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      vi.spyOn(prisma.productVariant, 'findUnique').mockResolvedValue({
        id: 'existing-var',
        productId: 'prod-123',
        variantType: 'Brand',
        variantValue: 'Odoo',
        additionalPrice: new Prisma.Decimal('560.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/v1/products/prod-123/variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantType: 'Brand',
          variantValue: 'Odoo',
          additionalPrice: 560,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('Subscription Plan Management (M03)', () => {
    it('GET /api/v1/plans should return 200 for authenticated users', async () => {
      const mockPlan = {
        id: 'plan-1',
        name: 'Startup Monthly',
        description: 'For growing businesses',
        price: new Prisma.Decimal('99.00'),
        billingFrequency: BillingFrequency.MONTHLY,
        intervalCount: 1,
        minimumQuantity: 1,
        availableFrom: new Date(),
        availableUntil: null,
        allowAutoClose: false,
        allowEarlyClose: true,
        allowPause: false,
        allowRenewal: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { subscriptions: 5, quotations: 2 },
      };

      vi.spyOn(prisma.subscriptionPlan, 'findMany').mockResolvedValue([mockPlan as any]);

      const res = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].price).toBe(99);
      expect(res.body.data[0].billingFrequency).toBe('MONTHLY');
    });

    it('POST /api/v1/plans should return 403 Forbidden for STAFF', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Enterprise Plan',
          price: 500,
          billingFrequency: 'YEARLY',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/plans should return 201 Created for ADMIN with valid cadence', async () => {
      const createdPlan = {
        id: 'plan-new',
        name: 'Enterprise Annual Tier',
        description: 'Billed yearly for 10+ seats',
        price: new Prisma.Decimal('1200.00'),
        billingFrequency: BillingFrequency.YEARLY,
        intervalCount: 1,
        minimumQuantity: 10,
        availableFrom: new Date(),
        availableUntil: null,
        allowAutoClose: false,
        allowEarlyClose: true,
        allowPause: true,
        allowRenewal: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.subscriptionPlan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.subscriptionPlan, 'create').mockResolvedValue(createdPlan as any);

      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Annual Tier',
          description: 'Billed yearly for 10+ seats',
          price: 1200.0,
          billingFrequency: 'YEARLY',
          minimumQuantity: 10,
          allowPause: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Enterprise Annual Tier');
      expect(res.body.data.billingFrequency).toBe('YEARLY');
      expect(res.body.data.price).toBe(1200);
      expect(res.body.data.allowPause).toBe(true);
    });

    it('POST /api/v1/plans should return 400 for invalid billing frequency', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Frequency Plan',
          price: 100,
          billingFrequency: 'BI_WEEKLY', // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
