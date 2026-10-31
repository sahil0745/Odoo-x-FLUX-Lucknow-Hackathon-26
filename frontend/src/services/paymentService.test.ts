import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from './paymentService';
import { apiClient } from './api';

describe('Payment Service Frontend Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getPayments calls GET /payments with params', async () => {
    const mockPayments = [
      {
        id: 'pay-1',
        paymentReference: 'PAY-202611-00001',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'BANK_TRANSFER',
      },
    ];

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: mockPayments,
      },
    } as any);

    const result = await paymentService.getPayments({ search: 'PAY-202611' });
    expect(apiClient.get).toHaveBeenCalledWith('/payments', {
      params: { search: 'PAY-202611' },
    });
    expect(result).toEqual(mockPayments);
  });

  it('recordPayment calls POST /payments with payload', async () => {
    const payload = {
      customerId: 'cust-1',
      amount: 250,
      paymentMethod: 'CREDIT_CARD' as const,
      allocations: [{ invoiceId: 'inv-1', amount: 250 }],
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 201,
        data: { id: 'pay-2', ...payload },
      },
    } as any);

    const result = await paymentService.recordPayment(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/payments', payload);
    expect(result.id).toBe('pay-2');
  });

  it('getCustomerUnpaidInvoices calls GET /payments/customers/:id/unpaid-invoices', async () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-202611-00001',
        balanceDue: 200,
      },
    ];

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: mockInvoices,
      },
    } as any);

    const result = await paymentService.getCustomerUnpaidInvoices('cust-1');
    expect(apiClient.get).toHaveBeenCalledWith('/payments/customers/cust-1/unpaid-invoices');
    expect(result).toEqual(mockInvoices);
  });
});
