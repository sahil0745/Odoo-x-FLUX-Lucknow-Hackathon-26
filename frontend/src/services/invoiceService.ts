import { apiClient } from './api';
import { Invoice } from '../types';

export const invoiceService = {
  async getInvoices(params?: { customerId?: string; status?: string }): Promise<Invoice[]> {
    const res = await apiClient.get('/invoices', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await apiClient.get(`/invoices/${id}`);
    return res.data.data;
  },

  async createInvoice(data: {
    customerId: string;
    dueDate: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      productId?: string;
    }>;
    lines?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      productId?: string;
    }>;
  }): Promise<Invoice> {
    const res = await apiClient.post('/invoices', data);
    return res.data.data;
  },

  async confirmInvoice(id: string): Promise<Invoice> {
    const res = await apiClient.post(`/invoices/${id}/confirm`);
    return res.data.data;
  },

  async cancelInvoice(id: string, reason?: string): Promise<Invoice> {
    const res = await apiClient.post(`/invoices/${id}/cancel`, { reason });
    return res.data.data;
  },

  async downloadPdf(id: string): Promise<Blob> {
    const res = await apiClient.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },
};
