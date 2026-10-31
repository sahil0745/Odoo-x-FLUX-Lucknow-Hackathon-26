import { apiClient } from './api';
import {
  Invoice,
  InvoiceStatus,
  BillingStats,
  BillingRunSummary,
  BillingCycleLog,
} from '../types';

export const invoiceService = {
  /**
   * List invoices with optional status/customer filtering
   */
  async listInvoices(filters?: {
    customerId?: string;
    subscriptionId?: string;
    status?: InvoiceStatus;
    search?: string;
    isOverdue?: boolean;
  }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.subscriptionId) params.append('subscriptionId', filters.subscriptionId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isOverdue !== undefined) params.append('isOverdue', String(filters.isOverdue));

    const res = await apiClient.get(`/invoices?${params.toString()}`);
    return res.data.data;
  },

  /**
   * Retrieve aggregate billing financial summary stats
   */
  async getBillingStats(): Promise<BillingStats> {
    const res = await apiClient.get('/invoices/stats');
    return res.data.data;
  },

  /**
   * Get single invoice details with line items
   */
  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await apiClient.get(`/invoices/${id}`);
    return res.data.data;
  },

  /**
   * Update invoice status (e.g. DRAFT -> CONFIRMED, CANCELLED)
   */
  async updateInvoiceStatus(
    id: string,
    payload: { status: InvoiceStatus; notes?: string }
  ): Promise<Invoice> {
    const res = await apiClient.patch(`/invoices/${id}/status`, payload);
    return res.data.data;
  },

  /**
   * Trigger the automated recurring billing run
   */
  async triggerBillingRun(payload?: {
    asOfDate?: string;
    subscriptionId?: string;
  }): Promise<BillingRunSummary> {
    const res = await apiClient.post('/billing/run', payload || {});
    return res.data.data;
  },

  /**
   * List automated recurring billing cycle execution logs
   */
  async listBillingLogs(subscriptionId?: string): Promise<BillingCycleLog[]> {
    const params = new URLSearchParams();
    if (subscriptionId) params.append('subscriptionId', subscriptionId);

    const res = await apiClient.get(`/billing/logs?${params.toString()}`);
    return res.data.data;
  },
};
