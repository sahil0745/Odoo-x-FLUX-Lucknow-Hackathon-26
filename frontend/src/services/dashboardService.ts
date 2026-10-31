import { apiClient } from './api';
import { DashboardOverview } from '../types';

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const res = await apiClient.get('/dashboard/overview');
    return res.data.data;
  },

  async getRevenueStats() {
    const res = await apiClient.get('/dashboard/revenue');
    return res.data.data;
  },

  async getSubscriptionStats() {
    const res = await apiClient.get('/dashboard/subscriptions');
    return res.data.data;
  },

  async getInvoiceStats() {
    const res = await apiClient.get('/dashboard/invoices');
    return res.data.data;
  },
};

