import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { prisma } from '../src/config/database';
import { Prisma, ProductType, UserRole } from '@prisma/client';

describe('Products & Variants API & RBAC Security Suite', () => {
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
          staffProfile: { id: 'sp-1', department: 'Operations', title: 'Support' },
        } as any;
      }
      return {
        id: 'customer-uuid-1',
        email: 'customer@brightloop.io',
        role: UserRole.CUSTOMER,
        isActive: true,
        customerProfile: { id: 'cp-1', contactName: 'Valued Customer', companyName: 'Acme' },
        staffProfile: null,
      } as any;
    });
  });

  // 1. Unauthenticated Protection
  it('rejects unauthenticated requests to product endpoints with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 2. Admin Create Product
  it('allows Admin to create a product with initial variants in a transaction', async () => {
    const newProduct = {
      id: 'prod-odoo-1',
      name: 'Odoo ERP Core',
      type: ProductType.SOFTWARE,
      salesPrice: new Prisma.Decimal('1000.00'),
      costPrice: new Prisma.Decimal('450.00'),
      notes: 'Internal enterprise margin notes',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      variants: [
        {
          id: 'var-1',
          productId: 'prod-odoo-1',
          variantType: 'Brand',
          variantValue: 'Odoo Enterprise',
          additionalPrice: new Prisma.Decimal('560.00'),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return callback({
        product: {
          create: vi.fn().mockResolvedValue(newProduct),
        },
      });
    });

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Odoo ERP Core',
        type: 'SOFTWARE',
        salesPrice: '1000.00',
        costPrice: '450.00',
        notes: 'Internal enterprise margin notes',
        variants: [
          {
            variantType: 'Brand',
            variantValue: 'Odoo Enterprise',
            additionalPrice: '560.00',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Odoo ERP Core');
    expect(res.body.data.salesPrice).toBe('1000.00');
    expect(res.body.data.costPrice).toBe('450.00');
    expect(res.body.data.variants).toHaveLength(1);
    expect(res.body.data.variants[0].additionalPrice).toBe('560.00');
  });

  // 3. Validation Rules
  it('rejects product creation when required fields are missing or prices are negative', async () => {
    // Missing name
    const res1 = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'SOFTWARE',
        salesPrice: '100.00',
        costPrice: '50.00',
      });
    expect(res1.status).toBe(400);

    // Negative sales price
    const res2 = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad Product',
        type: 'SOFTWARE',
        salesPrice: '-10.00',
        costPrice: '50.00',
      });
    expect(res2.status).toBe(400);

    // Invalid product type
    const res3 = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad Type Product',
        type: 'INVALID_TYPE',
        salesPrice: '100.00',
        costPrice: '50.00',
      });
    expect(res3.status).toBe(400);
  });

  // 4. RBAC: Staff and Customer cannot create or modify products
  it('forbids Staff from creating products (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Staff Unauthorized Product',
        type: 'SERVICE',
        salesPrice: '200.00',
        costPrice: '100.00',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('forbids Customer from creating products (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Customer Unauthorized Product',
        type: 'SOFTWARE',
        salesPrice: '100.00',
        costPrice: '50.00',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 5. Data Sanitization & Role Field Projections
  it('sanitizes product listings: Customer NEVER sees costPrice or notes', async () => {
    const mockProducts = [
      {
        id: 'p-1',
        name: 'Brightloop Analytics',
        type: ProductType.SOFTWARE,
        salesPrice: new Prisma.Decimal('500.00'),
        costPrice: new Prisma.Decimal('150.00'), // Sensitive
        notes: 'Strict internal margins note', // Sensitive
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      },
    ];

    vi.spyOn(prisma.product, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts as any);

    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].salesPrice).toBe('500.00');
    // Must be completely undefined/stripped
    expect(res.body.data[0].costPrice).toBeUndefined();
    expect(res.body.data[0].notes).toBeUndefined();
  });

  it('sanitizes product listings: Staff sees notes but CANNOT see costPrice', async () => {
    const mockProducts = [
      {
        id: 'p-1',
        name: 'Brightloop Analytics',
        type: ProductType.SOFTWARE,
        salesPrice: new Prisma.Decimal('500.00'),
        costPrice: new Prisma.Decimal('150.00'), // Sensitive
        notes: 'Operational deployment instructions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      },
    ];

    vi.spyOn(prisma.product, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts as any);

    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].salesPrice).toBe('500.00');
    expect(res.body.data[0].notes).toBe('Operational deployment instructions');
    // Staff cannot view cost price
    expect(res.body.data[0].costPrice).toBeUndefined();
  });

  it('allows Admin to see all fields including costPrice and internal notes', async () => {
    const mockProducts = [
      {
        id: 'p-1',
        name: 'Brightloop Analytics',
        type: ProductType.SOFTWARE,
        salesPrice: new Prisma.Decimal('500.00'),
        costPrice: new Prisma.Decimal('150.00'),
        notes: 'Confidential executive margin analysis',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      },
    ];

    vi.spyOn(prisma.product, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts as any);

    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].salesPrice).toBe('500.00');
    expect(res.body.data[0].costPrice).toBe('150.00');
    expect(res.body.data[0].notes).toBe('Confidential executive margin analysis');
  });

  // 6. Historical Reference Protection
  it('protects historical integrity: prevents physical deletion of products referenced by invoices or subscriptions', async () => {
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 'prod-in-use',
      name: 'Active Subscription Core',
      _count: {
        quotationLines: 2,
        subscriptionLines: 5,
        invoiceLines: 3,
        quotationTemplateLines: 0,
      },
    } as any);

    const res = await request(app)
      .delete('/api/v1/products/prod-in-use')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409); // Conflict
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot delete product.*referenced by.*historical records/i);
  });

  it('allows safe physical deletion of unused products', async () => {
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 'prod-unused',
      name: 'Unused Draft Product',
      _count: {
        quotationLines: 0,
        subscriptionLines: 0,
        invoiceLines: 0,
        quotationTemplateLines: 0,
      },
    } as any);

    vi.spyOn(prisma.product, 'delete').mockResolvedValue({ id: 'prod-unused' } as any);

    const res = await request(app)
      .delete('/api/v1/products/prod-unused')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/successfully deleted/i);
  });

  // 7. Product Variant Management
  it('allows Admin to create a variant and prevents duplicate type/value combinations', async () => {
    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 'prod-1' } as any);

    // Mock uniqueness conflict on second creation
    let callCount = 0;
    vi.spyOn(prisma.productVariant, 'findUnique').mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? null : ({ id: 'existing-var' } as any);
    });

    vi.spyOn(prisma.productVariant, 'create').mockResolvedValue({
      id: 'var-new-1',
      productId: 'prod-1',
      variantType: 'Edition',
      variantValue: 'Professional',
      additionalPrice: new Prisma.Decimal('300.00'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1st call: success
    const res1 = await request(app)
      .post('/api/v1/products/prod-1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        variantType: 'Edition',
        variantValue: 'Professional',
        additionalPrice: '300.00',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.variantValue).toBe('Professional');
    expect(res1.body.data.additionalPrice).toBe('300.00');

    // 2nd call with duplicate combination: 409 Conflict
    const res2 = await request(app)
      .post('/api/v1/products/prod-1/variants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        variantType: 'Edition',
        variantValue: 'Professional',
        additionalPrice: '300.00',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.message).toMatch(/already exists for this product/i);
  });

  // 8. Price Calculation Endpoint
  it('calculates price breakdown via POST /api/v1/products/:id/calculate-price (1000 + 560 = 1560)', async () => {
    const prodId = 'e290fbb6-46b3-469b-8d19-450f28a7e001';
    const varId = '85e92be1-d24e-48a0-9c29-873b22a0e002';

    vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: prodId,
      name: 'Odoo Base Subscription',
      salesPrice: new Prisma.Decimal('1000.00'),
    } as any);

    vi.spyOn(prisma.productVariant, 'findMany').mockResolvedValue([
      {
        id: varId,
        productId: prodId,
        variantType: 'Brand',
        variantValue: 'Odoo Enterprise Upgrade',
        additionalPrice: new Prisma.Decimal('560.00'),
        isActive: true,
      },
    ]);

    const res = await request(app)
      .post(`/api/v1/products/${prodId}/calculate-price`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        selectedVariantIds: [varId],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.baseSalesPrice).toBe('1000.00');
    expect(res.body.data.totalVariantAdditions).toBe('560.00');
    expect(res.body.data.finalPrice).toBe('1560.00');
    expect(res.body.data.currency).toBe('USD');
    expect(res.body.data.selectedVariants[0].variantValue).toBe('Odoo Enterprise Upgrade');
  });
});
