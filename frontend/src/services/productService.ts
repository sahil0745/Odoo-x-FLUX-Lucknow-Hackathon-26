import { apiClient } from './api';
import { Product, ProductVariant } from '../types';

export const productService = {
  async getProducts(params?: { search?: string; type?: string; isActive?: boolean }): Promise<Product[]> {
    const res = await apiClient.get('/products', { params });
    const data = res.data.data;
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async getProductById(id: string): Promise<Product> {
    const res = await apiClient.get(`/products/${id}`);
    return res.data.data;
  },

  async createProduct(data: {
    name: string;
    description?: string;
    notes?: string;
    type: string;
    salesPrice: number;
    costPrice?: number;
  }): Promise<Product> {
    const res = await apiClient.post('/products', data);
    return res.data.data;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await apiClient.patch(`/products/${id}`, data);
    return res.data.data;
  },

  async createVariant(productId: string, data: {
    variantType?: string;
    variantValue?: string;
    name?: string;
    description?: string;
    variantPrice?: number;
    additionalPrice?: number;
    sku?: string;
  }): Promise<ProductVariant> {
    const res = await apiClient.post(`/products/${productId}/variants`, data);
    return res.data.data;
  },

  async updateVariant(variantId: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
    const res = await apiClient.patch(`/products/variants/${variantId}`, data);
    return res.data.data;
  },
};
