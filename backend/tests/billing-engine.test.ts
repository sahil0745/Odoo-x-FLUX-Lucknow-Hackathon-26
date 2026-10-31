import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingEngineService } from '../src/modules/billing/billing-engine.service';
import { prisma } from '../src/config/database';
import {
  SubscriptionStatus,
  BillingFrequency,
  BillingRunStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

describe('Automatic Billing Engine & Deduplication (M06) Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockSubscription = {
    id: 'sub-test-1',
    subscriptionNumber: 'SUB-2026-00001',
    customerId: 'cust-uuid-1',
    planId: 'plan-uuid-1',
    status: SubscriptionStatus.ACTIVE,
    nextBillingDate: new Date('2026-11-01T00:00:00.000Z'),
    lastBilledDate: null,
    paymentTerms: 'Net 30',
    currency: 'USD',
    subtotal: new Prisma.Decimal('1000.00'),
    taxAmount: new Prisma.Decimal('180.00'),
    discountAmount: new Prisma.Decimal('50.00'),
    totalAmount: new Prisma.Decimal('1130.00'),
    renewalCount: 0,
    customer: {
      id: 'cust-uuid-1',
      contactName: 'Alice Customer',
      companyName: 'Acme Software',
    },
    plan: {
      id: 'plan-uuid-1',
      name: 'Startup Monthly',
      billingFrequency: BillingFrequency.MONTHLY,
      intervalCount: 1,
    },
    lines: [
      {
        id: 'line-1',
        productId: 'prod-1',
        variantId: 'var-1',
        taxRuleId: null,
        quantity: 1,
        unitPrice: new Prisma.Decimal('1000.00'),
        discountAmount: new Prisma.Decimal('50.00'),
        taxRate: new Prisma.Decimal('18.00'),
        taxAmount: new Prisma.Decimal('180.00'),
        lineTotal: new Prisma.Decimal('1130.00'),
        product: { name: 'Brightloop ERP Core' },
        variant: { variantType: 'Brand', variantValue: 'Odoo' },
      },
    ],
  };

  it('generates an invoice for active subscription due for billing', async () => {
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([mockSubscription as any]);
    vi.spyOn(prisma.billingCycleLog, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.invoice, 'count').mockResolvedValue(0);

    const mockCreatedInvoice = {
      id: 'inv-test-1',
      invoiceNumber: 'INV-202611-00001',
      status: InvoiceStatus.CONFIRMED,
      grandTotal: new Prisma.Decimal('1130.00'),
      lines: [],
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const txMock = {
        invoice: { create: vi.fn().mockResolvedValue(mockCreatedInvoice) },
        billingCycleLog: { upsert: vi.fn().mockResolvedValue({}) },
        subscription: { update: vi.fn().mockResolvedValue({}) },
      };
      return callback(txMock);
    });

    const summary = await billingEngineService.processBillingRun({
      asOfDate: new Date('2026-11-01T12:00:00.000Z'),
    });

    expect(summary.processed).toBe(1);
    expect(summary.generated).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.invoicesGenerated).toContain('INV-202611-00001');
  });

  it('DEDUPLICATION GUARANTEE: skips billing if BillingCycleLog status is GENERATED', async () => {
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([mockSubscription as any]);
    vi.spyOn(prisma.billingCycleLog, 'findUnique').mockResolvedValue({
      id: 'cycle-log-1',
      subscriptionId: 'sub-test-1',
      billingPeriodStart: new Date('2026-11-01T00:00:00.000Z'),
      status: BillingRunStatus.GENERATED,
    } as any);

    const txSpy = vi.spyOn(prisma, '$transaction');

    const summary = await billingEngineService.processBillingRun({
      asOfDate: new Date('2026-11-01T12:00:00.000Z'),
    });

    expect(summary.processed).toBe(1);
    expect(summary.generated).toBe(0);
    expect(summary.skipped).toBe(1); // Zero duplicate invoice created!
    expect(summary.failed).toBe(0);
    expect(txSpy).not.toHaveBeenCalled();
  });

  it('records failure and tracks retry count when an error occurs during invoice creation', async () => {
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([mockSubscription as any]);
    vi.spyOn(prisma.billingCycleLog, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.invoice, 'count').mockResolvedValue(0);

    vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('Database deadlocked'));
    const upsertLogSpy = vi.spyOn(prisma.billingCycleLog, 'upsert').mockResolvedValue({} as any);

    const summary = await billingEngineService.processBillingRun({
      asOfDate: new Date('2026-11-01T12:00:00.000Z'),
    });

    expect(summary.processed).toBe(1);
    expect(summary.generated).toBe(0);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].error).toMatch(/Database deadlocked/);

    expect(upsertLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: BillingRunStatus.FAILED,
          retryCount: 1,
        }),
      })
    );
  });
});
