import { apiClient } from './api';
import { Payment, PaymentMethod } from '../types';

export const paymentService = {
  async getPayments(params?: { customerId?: string }): Promise<Payment[]> {
    const res = await apiClient.get('/payments', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async recordPayment(data: {
    customerId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
    notes?: string;
    allocations?: Array<{
      invoiceId: string;
      amount: number;
    }>;
  }): Promise<Payment> {
    const res = await apiClient.post('/payments', data);
    return res.data.data;
  },

  async allocatePayment(paymentId: string, allocations: Array<{ invoiceId: string; amount: number }>) {
    const res = await apiClient.post(`/payments/${paymentId}/allocations`, { allocations });
    return res.data.data;
  },
};
