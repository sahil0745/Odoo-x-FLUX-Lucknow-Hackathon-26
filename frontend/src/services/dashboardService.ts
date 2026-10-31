import { apiClient } from './api';
import { DashboardMetrics } from '../types';

export const dashboardService = {
  /**
   * Fetch aggregate executive business intelligence metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data.data;
  },
};
