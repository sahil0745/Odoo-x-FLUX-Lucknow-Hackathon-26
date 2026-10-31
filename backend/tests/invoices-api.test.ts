import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { prisma } from '../src/config/database';
import { InvoiceStatus, Prisma } from '@prisma/client';

describe('Invoices & Billing API (M06) Test Suite', () => {
  const app = createApp();

  const customerToken = generateAccessToken({
    userId: 'cust-user-1',
    email: 'customer@brightloop.io',
    role: 'CUSTOMER',
  });

  const staffToken = generateAccessToken({
    userId: 'staff-user-1',
    email: 'staff@brightloop.io',
    role: 'STAFF',
  });

  const adminToken = generateAccessToken({
    userId: 'admin-user-1',
    email: 'admin@brightloop.io',
    role: 'ADMIN',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockInvoice = {
    id: 'inv-uuid-1',
    invoiceNumber: 'INV-202611-00001',
    subscriptionId: 'sub-uuid-1',
    customerId: 'cust-profile-1',
    status: InvoiceStatus.CONFIRMED,
    issueDate: new Date('2026-11-01'),
    dueDate: new Date('2026-12-01'),
    billingPeriodStart: new Date('2026-11-01'),
    billingPeriodEnd: new Date('2026-11-30'),
    currency: 'USD',
    subtotal: new Prisma.Decimal('1000.00'),
    taxAmount: new Prisma.Decimal('180.00'),
    discountAmount: new Prisma.Decimal('50.00'),
    grandTotal: new Prisma.Decimal('1130.00'),
    paidAmount: new Prisma.Decimal('0.00'),
    balanceDue: new Prisma.Decimal('1130.00'),
    notes: null,
    lines: [],
    customer: { contactName: 'Alice', companyName: 'Acme' },
    subscription: { plan: { name: 'Startup Monthly' } },
    _count: { allocations: 0 },
  };

  it('GET /api/v1/invoices should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/invoices');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/invoices should strictly scope CUSTOMER to their own profile', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'cust-user-1',
      role: 'CUSTOMER',
      isActive: true,
      customerProfile: { id: 'cust-profile-1' },
      staffProfile: null,
    } as any);

    const findManySpy = vi.spyOn(prisma.invoice, 'findMany').mockResolvedValue([mockInvoice as any]);

    const res = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'cust-profile-1',
        }),
      })
    );
  });

  it('GET /api/v1/invoices/stats should return aggregated totals for staff', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'staff-user-1',
      role: 'STAFF',
      isActive: true,
      customerProfile: null,
      staffProfile: { id: 'staff-profile-1' },
    } as any);

    vi.spyOn(prisma.invoice, 'findMany').mockResolvedValue([
      {
        status: InvoiceStatus.CONFIRMED,
        grandTotal: new Prisma.Decimal('1130.00'),
        paidAmount: new Prisma.Decimal('300.00'),
        balanceDue: new Prisma.Decimal('830.00'),
      },
    ] as any);

    vi.spyOn(prisma.invoice, 'count').mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/invoices/stats')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalInvoiced).toBe(1130);
    expect(res.body.data.totalPaid).toBe(300);
    expect(res.body.data.totalBalanceDue).toBe(830);
  });

  it('PATCH /api/v1/invoices/:id/status forbids customer (requires invoices.manage)', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'cust-user-1',
      role: 'CUSTOMER',
      isActive: true,
      customerProfile: { id: 'cust-profile-1' },
      staffProfile: null,
    } as any);

    const res = await request(app)
      .patch('/api/v1/invoices/inv-uuid-1/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/invoices/:id/status allows STAFF to cancel an unpaid invoice', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'staff-user-1',
      role: 'STAFF',
      isActive: true,
      customerProfile: null,
      staffProfile: { id: 'staff-profile-1' },
    } as any);

    vi.spyOn(prisma.invoice, 'findUnique').mockResolvedValue(mockInvoice as any);
    vi.spyOn(prisma.invoice, 'update').mockResolvedValue({
      ...mockInvoice,
      status: InvoiceStatus.CANCELLED,
    } as any);

    const res = await request(app)
      .patch('/api/v1/invoices/inv-uuid-1/status')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'CANCELLED', notes: 'Customer requested plan alteration' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('POST /api/v1/billing/run triggers recurring billing engine', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'admin-user-1',
      role: 'ADMIN',
      isActive: true,
      customerProfile: null,
      staffProfile: null,
    } as any);

    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/billing/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(0);
  });
});
