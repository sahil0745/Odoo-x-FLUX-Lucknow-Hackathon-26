import { apiClient } from './api';
import { Tax, Discount } from '../types';

export const taxDiscountService = {
  // Taxes
  async getTaxes(): Promise<Tax[]> {
    const res = await apiClient.get('/taxes');
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async createTax(data: {
    name: string;
    rate: number;
    type: 'PERCENTAGE' | 'FIXED';
    isDefault?: boolean;
  }): Promise<Tax> {
    const res = await apiClient.post('/taxes', data);
    return res.data.data;
  },

  async updateTax(id: string, data: Partial<Tax>): Promise<Tax> {
    const res = await apiClient.patch(`/taxes/${id}`, data);
    return res.data.data;
  },

  // Discounts
  async getDiscounts(): Promise<Discount[]> {
    const res = await apiClient.get('/discounts');
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async createDiscount(data: {
    code: string;
    description?: string;
    value: number;
    type: 'PERCENTAGE' | 'FIXED';
    scope: 'SUBSCRIPTION' | 'PRODUCT';
    minPurchaseAmount?: number;
    maxUsageCount?: number;
    validFrom?: string;
    validUntil?: string;
  }): Promise<Discount> {
    const res = await apiClient.post('/discounts', data);
    return res.data.data;
  },

  async validateDiscount(code: string, purchaseAmount: number) {
    const res = await apiClient.post('/discounts/validate', { code, purchaseAmount });
    return res.data.data;
  },
};

