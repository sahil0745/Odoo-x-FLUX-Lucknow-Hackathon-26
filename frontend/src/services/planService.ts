import { apiClient } from './api';
import {
  SubscriptionPlan,
  CreatePlanPayload,
  BillingFrequency,
} from '../types';

export const planService = {
  /**
   * Fetch all subscription plans with optional filters
   */
  async listPlans(filters?: {
    billingFrequency?: BillingFrequency;
    isActive?: boolean;
    activeOnly?: boolean;
  }): Promise<SubscriptionPlan[]> {
    const params = new URLSearchParams();
    if (filters?.billingFrequency) params.append('billingFrequency', filters.billingFrequency);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.activeOnly !== undefined) params.append('activeOnly', String(filters.activeOnly));

    const res = await apiClient.get(`/plans?${params.toString()}`);
    return res.data.data;
  },

  /**
   * Fetch single plan by ID
   */
  async getPlanById(id: string): Promise<SubscriptionPlan> {
    const res = await apiClient.get(`/plans/${id}`);
    return res.data.data;
  },

  /**
   * Create new plan (Admin only)
   */
  async createPlan(payload: CreatePlanPayload): Promise<SubscriptionPlan> {
    const res = await apiClient.post('/plans', payload);
    return res.data.data;
  },

  /**
   * Update plan (Admin only)
   */
  async updatePlan(id: string, payload: Partial<CreatePlanPayload>): Promise<SubscriptionPlan> {
    const res = await apiClient.put(`/plans/${id}`, payload);
    return res.data.data;
  },

  /**
   * Delete or archive plan (Admin only)
   */
  async deletePlan(id: string): Promise<{ message: string; plan?: SubscriptionPlan }> {
    const res = await apiClient.delete(`/plans/${id}`);
    return res.data;
  },
};
