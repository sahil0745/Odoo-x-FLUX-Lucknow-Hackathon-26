import { apiClient } from './api';
import { Plan, BillingFrequency } from '../types';

export const planService = {
  async getPlans(params?: { isActive?: boolean }): Promise<Plan[]> {
    const res = await apiClient.get('/plans', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getPlanById(id: string): Promise<Plan> {
    const res = await apiClient.get(`/plans/${id}`);
    return res.data.data;
  },

  async createPlan(data: {
    name: string;
    description?: string;
    billingFrequency: BillingFrequency;
    intervalCount?: number;
    trialDays?: number;
    isRenewable?: boolean;
    autoCloseAfterDays?: number;
  }): Promise<Plan> {
    const res = await apiClient.post('/plans', data);
    return res.data.data;
  },

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
    const res = await apiClient.patch(`/plans/${id}`, data);
    return res.data.data;
  },
};
