import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoiceService } from './invoiceService';
import { apiClient } from './api';

describe('Invoice & Automated Billing Service (M06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists invoices with filtering parameters', async () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-202611-00001',
        grandTotal: 1130,
        paidAmount: 0,
        balanceDue: 1130,
        status: 'CONFIRMED',
      },
    ];

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { success: true, data: mockInvoices },
    } as any);

    const result = await invoiceService.listInvoices({ status: 'CONFIRMED' });
    expect(result).toHaveLength(1);
    expect(result[0].invoiceNumber).toBe('INV-202611-00001');
    expect(result[0].balanceDue).toBe(1130);
  });

  it('fetches billing financial summary stats', async () => {
    const mockStats = {
      totalInvoices: 5,
      totalInvoiced: 5650,
      totalPaid: 2000,
      totalBalanceDue: 3650,
      overdueCount: 1,
      statusBreakdown: { draft: 1, confirmed: 3, paid: 1 },
    };

    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { success: true, data: mockStats },
    } as any);

    const stats = await invoiceService.getBillingStats();
    expect(stats.totalInvoiced).toBe(5650);
    expect(stats.overdueCount).toBe(1);
  });

  it('triggers recurring billing engine run', async () => {
    const mockSummary = {
      processed: 4,
      generated: 2,
      skipped: 2,
      failed: 0,
      asOfDate: '2026-11-01T00:00:00.000Z',
      invoicesGenerated: ['INV-202611-00001', 'INV-202611-00002'],
      errors: [],
    };

    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { success: true, data: mockSummary },
    } as any);

    const summary = await invoiceService.triggerBillingRun({
      asOfDate: '2026-11-01',
    });

    expect(summary.generated).toBe(2);
    expect(summary.skipped).toBe(2);
  });
});
