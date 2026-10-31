import { apiClient } from './api';
import {
  SubscriptionPlan,
  CreatePlanPayload,
  UpdatePlanPayload,
  QuantityValidationResult,
  BillingCycleResult,
  PaginationMeta,
  BillingFrequency,
} from '../types';

export interface PlanListResponse {
  success: boolean;
  data: {
    plans: SubscriptionPlan[];
    pagination: PaginationMeta;
  };
}

export interface SinglePlanResponse {
  success: boolean;
  message?: string;
  data: {
    plan: SubscriptionPlan;
  };
}

export interface QuantityValidationResponse {
  success: boolean;
  data: {
    validation: QuantityValidationResult;
  };
}

export interface BillingCycleResponse {
  success: boolean;
  data: BillingCycleResult;
}

export const planService = {
  /**
   * Fetch paginated list of subscription plans with optional search, frequency, and status filters.
   */
  async getPlans(params?: {
    page?: number;
    limit?: number;
    search?: string;
    billingFrequency?: BillingFrequency;
    isActive?: boolean | string;
    availability?: 'all' | 'available' | 'upcoming' | 'expired';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ plans: SubscriptionPlan[]; pagination: PaginationMeta }> {
    const response = await apiClient.get<PlanListResponse>('/plans', {
      params,
    });
    return response.data.data;
  },

  /**
   * Fetch single subscription plan by ID.
   */
  async getPlanById(id: string): Promise<SubscriptionPlan> {
    const response = await apiClient.get<SinglePlanResponse>(`/plans/${id}`);
    return response.data.data.plan;
  },

  /**
   * Create a new subscription plan (Admin only).
   */
  async createPlan(payload: CreatePlanPayload): Promise<SubscriptionPlan> {
    const response = await apiClient.post<SinglePlanResponse>('/plans', payload);
    return response.data.data.plan;
  },

  /**
   * Update plan configuration (Admin only).
   */
  async updatePlan(id: string, payload: UpdatePlanPayload): Promise<SubscriptionPlan> {
    const response = await apiClient.patch<SinglePlanResponse>(`/plans/${id}`, payload);
    return response.data.data.plan;
  },

  /**
   * Toggle plan active/inactive status (Admin only).
   */
  async updatePlanStatus(id: string, isActive: boolean): Promise<SubscriptionPlan> {
    const response = await apiClient.patch<SinglePlanResponse>(`/plans/${id}/status`, {
      isActive,
    });
    return response.data.data.plan;
  },

  /**
   * Delete unreferenced plan (Admin only).
   */
  async deletePlan(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/plans/${id}`);
    return response.data;
  },

  /**
   * Validate requested quantity against plan minimum quantity.
   */
  async validateQuantity(id: string, quantity: number): Promise<QuantityValidationResult> {
    const response = await apiClient.post<QuantityValidationResponse>(
      `/plans/${id}/validate-quantity`,
      { quantity }
    );
    return response.data.data.validation;
  },

  /**
   * Calculate next billing date utility.
   */
  async calculateNextBillingDate(
    startDate: string,
    billingFrequency: BillingFrequency,
    intervalCount: number = 1,
    anchorDay?: number
  ): Promise<BillingCycleResult> {
    const response = await apiClient.post<BillingCycleResponse>('/plans/next-billing-date', {
      startDate,
      billingFrequency,
      intervalCount,
      anchorDay,
    });
    return response.data.data;
  },
};
