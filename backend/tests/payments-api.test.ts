import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/utils/token';
import { prisma } from '../src/config/database';
import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';

describe('Payments Management (M08) Test Suite', () => {
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

  it('GET /api/v1/payments should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/payments');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/payments should return 403 when executed by CUSTOMER', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        customerId: 'a0000000-0000-0000-0000-000000000001',
        amount: 500,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/payments should list payments for staff', async () => {
    const mockPayment = {
      id: 'pay-uuid-1',
      paymentReference: 'PAY-202611-00001',
      customerId: 'cust-profile-1',
      amount: new Prisma.Decimal('500.00'),
      currency: 'USD',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: new Date('2026-11-01'),
      notes: 'Wire transfer',
      customer: {
        id: 'cust-profile-1',
        companyName: 'Acme Corp',
        contactName: 'Alice',
        contactEmail: 'alice@acme.com',
      },
      recordedBy: {
        id: 'staff-user-1',
        name: 'Staff Member',
        email: 'staff@brightloop.io',
      },
      allocations: [
        {
          id: 'alloc-1',
          invoiceId: 'inv-1',
          allocatedAmount: new Prisma.Decimal('500.00'),
          createdAt: new Date(),
          invoice: {
            id: 'inv-1',
            invoiceNumber: 'INV-202611-00001',
            grandTotal: new Prisma.Decimal('500.00'),
            balanceDue: new Prisma.Decimal('0.00'),
            status: InvoiceStatus.PAID,
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([mockPayment] as any);

    const res = await request(app)
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].paymentReference).toBe('PAY-202611-00001');
    expect(res.body.data[0].amount).toBe(500);
  });

  it('POST /api/v1/payments should reject when allocation exceeds total payment amount', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: 'a0000000-0000-0000-0000-000000000001',
        amount: 200,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        allocations: [
          {
            invoiceId: 'b0000000-0000-0000-0000-000000000001',
            amount: 300, // Exceeds 200
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(JSON.stringify(res.body.details)).toContain('Sum of allocated amounts cannot exceed');
  });

  it('GET /api/v1/payments/stats should compute aggregated payment metrics', async () => {
    vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
      {
        amount: new Prisma.Decimal('1000.00'),
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      },
      {
        amount: new Prisma.Decimal('250.00'),
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CREDIT_CARD,
      },
    ] as any);

    const res = await request(app)
      .get('/api/v1/payments/stats')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCollected).toBe(1250);
    expect(res.body.data.totalPaymentsCount).toBe(2);
    expect(res.body.data.methodBreakdown[PaymentMethod.BANK_TRANSFER]).toBe(1000);
    expect(res.body.data.methodBreakdown[PaymentMethod.CREDIT_CARD]).toBe(250);
  });
});
