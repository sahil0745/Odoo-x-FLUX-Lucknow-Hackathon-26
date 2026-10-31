import { apiClient } from './api';
import { CustomerDetail, CustomerProfile, Quotation, Subscription, Invoice, Payment } from '../types';

export const customerService = {
  async getCustomers(params?: { search?: string; page?: number; limit?: number }): Promise<CustomerProfile[]> {
    const res = await apiClient.get('/customers', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getCustomerById(id: string): Promise<CustomerDetail> {
    const res = await apiClient.get(`/customers/${id}`);
    return res.data.data;
  },

  async createCustomer(data: {
    email: string;
    contactName: string;
    companyName?: string;
    phone?: string;
    billingAddress?: string;
    city?: string;
    country?: string;
    taxNumber?: string;
    password?: string;
  }): Promise<CustomerProfile> {
    const res = await apiClient.post('/customers', data);
    return res.data.data;
  },

  async updateCustomer(id: string, data: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const res = await apiClient.patch(`/customers/${id}`, data);
    return res.data.data;
  },

  async getCustomerSubscriptions(id: string): Promise<Subscription[]> {
    const res = await apiClient.get(`/customers/${id}/subscriptions`);
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getCustomerQuotations(id: string): Promise<Quotation[]> {
    const res = await apiClient.get(`/customers/${id}/quotations`);
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getCustomerInvoices(id: string): Promise<Invoice[]> {
    const res = await apiClient.get(`/customers/${id}/invoices`);
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getCustomerPayments(id: string): Promise<Payment[]> {
    const res = await apiClient.get(`/customers/${id}/payments`);
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },
};
