import { apiClient } from './api';
import { Subscription } from '../types';

export const subscriptionService = {
  async getSubscriptions(params?: { customerId?: string; status?: string }): Promise<Subscription[]> {
    const res = await apiClient.get('/subscriptions', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getSubscriptionById(id: string): Promise<Subscription> {
    const res = await apiClient.get(`/subscriptions/${id}`);
    return res.data.data;
  },

  async createSubscription(data: {
    customerId: string;
    planId: string;
    startDate?: string;
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
  }): Promise<Subscription> {
    const payload = {
      ...data,
      lines: data.lines || data.items,
    };
    const res = await apiClient.post('/subscriptions', payload);
    return res.data.data;
  },

  async activateSubscription(id: string): Promise<Subscription> {
    const res = await apiClient.post(`/subscriptions/${id}/activate`);
    return res.data.data;
  },

  async pauseSubscription(id: string, reason?: string): Promise<Subscription> {
    const res = await apiClient.post(`/subscriptions/${id}/pause`, { reason });
    return res.data.data;
  },

  async resumeSubscription(id: string): Promise<Subscription> {
    const res = await apiClient.post(`/subscriptions/${id}/resume`);
    return res.data.data;
  },

  async closeSubscription(id: string, reason?: string): Promise<Subscription> {
    const res = await apiClient.post(`/subscriptions/${id}/close`, { reason });
    return res.data.data;
  },

  async renewSubscription(id: string): Promise<Subscription> {
    const res = await apiClient.post(`/subscriptions/${id}/renew`);
    return res.data.data;
  },
};
