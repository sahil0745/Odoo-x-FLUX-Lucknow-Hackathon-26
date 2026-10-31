import { apiClient } from './api';
import {
  Payment,
  PaymentStats,
  RecordPaymentPayload,
  UnpaidCustomerInvoice,
  PaymentMethod,
} from '../types';

export const paymentService = {
  /**
   * List payments with optional filtering
   */
  async getPayments(params?: {
    customerId?: string;
    paymentMethod?: PaymentMethod;
    search?: string;
  }): Promise<Payment[]> {
    const response = await apiClient.get('/payments', {
      params,
    });
    return response.data.data;
  },

  /**
   * Get payment details by ID
   */
  async getPaymentById(id: string): Promise<Payment> {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
  },

  /**
   * Record a new payment and apply allocations
   */
  async recordPayment(payload: RecordPaymentPayload): Promise<Payment> {
    const response = await apiClient.post('/payments', payload);
    return response.data.data;
  },

  /**
   * Get payment summary metrics
   */
  async getPaymentStats(): Promise<PaymentStats> {
    const response = await apiClient.get('/payments/stats');
    return response.data.data;
  },

  /**
   * Fetch outstanding confirmed invoices for a customer to allocate payment
   */
  async getCustomerUnpaidInvoices(customerId: string): Promise<UnpaidCustomerInvoice[]> {
    const response = await apiClient.get(
      `/payments/customers/${customerId}/unpaid-invoices`
    );
    return response.data.data;
  },
};
