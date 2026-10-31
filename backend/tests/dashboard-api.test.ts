import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { prisma } from '../src/config/database';
import { SubscriptionStatus, InvoiceStatus, BillingFrequency, PaymentMethod, Prisma } from '@prisma/client';

describe('Executive Dashboard API (M12) Test Suite', () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/dashboard/metrics should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/dashboard/metrics');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/dashboard/metrics should return 403 when accessed by CUSTOMER', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/dashboard/metrics should return aggregated metrics for STAFF', async () => {
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
      {
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        totalAmount: new Prisma.Decimal('100.00'),
        plan: { billingFrequency: BillingFrequency.MONTHLY },
      },
      {
        id: 'sub-2',
        status: SubscriptionStatus.PAUSED,
        totalAmount: new Prisma.Decimal('50.00'),
        plan: { billingFrequency: BillingFrequency.MONTHLY },
      },
    ] as any);

    vi.spyOn(prisma.invoice, 'findMany').mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: 'INV-202611-00001',
        status: InvoiceStatus.CONFIRMED,
        grandTotal: new Prisma.Decimal('200.00'),
        paidAmount: new Prisma.Decimal('50.00'),
        balanceDue: new Prisma.Decimal('150.00'),
        issueDate: new Date(),
        dueDate: new Date(Date.now() - 86400000), // Overdue yesterday
        customer: { companyName: 'Acme Corp', contactName: 'Alice' },
      },
    ] as any);

    vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
      {
        id: 'pay-1',
        paymentReference: 'PAY-202611-00001',
        amount: new Prisma.Decimal('50.00'),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentDate: new Date(),
        customer: { companyName: 'Acme Corp', contactName: 'Alice' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/v1/dashboard/metrics')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscriptions.active).toBe(1);
    expect(res.body.data.subscriptions.paused).toBe(1);
    expect(res.body.data.subscriptions.mrr).toBe(100);
    expect(res.body.data.revenue.totalInvoiced).toBe(200);
    expect(res.body.data.revenue.totalCollected).toBe(50);
    expect(res.body.data.revenue.totalOutstanding).toBe(150);
    expect(res.body.data.overdue.count).toBe(1);
    expect(res.body.data.overdue.totalAmount).toBe(150);
  });
});
