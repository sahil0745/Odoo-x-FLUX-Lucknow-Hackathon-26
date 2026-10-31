import { apiClient } from './api';
import { Quotation } from '../types';

export interface CreateQuotationPayload {
  customerId: string;
  validUntil?: string;
  notes?: string;
  items?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice?: number;
  }>;
  lines?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice?: number;
  }>;
  discountId?: string;
  taxIds?: string[];
}

export const quotationService = {
  async getQuotations(params?: { customerId?: string; status?: string }): Promise<Quotation[]> {
    const res = await apiClient.get('/quotations', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getQuotationById(id: string): Promise<Quotation> {
    const res = await apiClient.get(`/quotations/${id}`);
    return res.data.data;
  },

  async createQuotation(data: CreateQuotationPayload): Promise<Quotation> {
    const payload = {
      ...data,
      lines: data.lines || data.items,
    };
    const res = await apiClient.post('/quotations', payload);
    return res.data.data;
  },

  async acceptQuotation(id: string): Promise<Quotation> {
    const res = await apiClient.post(`/quotations/${id}/accept`);
    return res.data.data;
  },

  async rejectQuotation(id: string, reason?: string): Promise<Quotation> {
    const res = await apiClient.post(`/quotations/${id}/reject`, { reason });
    return res.data.data;
  },

  async convertToSubscription(id: string, data: { planId: string; startDate?: string }): Promise<any> {
    const res = await apiClient.post(`/quotations/${id}/convert`, data);
    return res.data.data;
  },
};
