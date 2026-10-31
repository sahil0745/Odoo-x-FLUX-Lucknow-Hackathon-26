import { apiClient } from './api';
import {
  Subscription,
  SubscriptionStatus,
} from '../types';

export const subscriptionService = {
  /**
   * List subscriptions with optional filters
   */
  async listSubscriptions(filters?: {
    customerId?: string;
    status?: SubscriptionStatus;
    search?: string;
  }): Promise<Subscription[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await apiClient.get(`/subscriptions?${params.toString()}`);
    return res.data.data;
  },

  /**
   * Get single subscription details
   */
  async getSubscriptionById(id: string): Promise<Subscription> {
    const res = await apiClient.get(`/subscriptions/${id}`);
    return res.data.data;
  },

  /**
   * Update subscription lifecycle status (e.g. ACTIVE, PAUSED, CLOSED)
   */
  async updateSubscriptionStatus(
    id: string,
    payload: { status: SubscriptionStatus; reason?: string }
  ): Promise<Subscription> {
    const res = await apiClient.patch(`/subscriptions/${id}/status`, payload);
    return res.data.data;
  },
};
