import { apiClient } from './api';
import {
  Product,
  ProductVariant,
  CreateProductPayload,
  CreateVariantPayload,
  ProductType,
} from '../types';

export const productService = {
  /**
   * Fetch all products with optional filters
   */
  async listProducts(filters?: {
    search?: string;
    type?: ProductType;
    isActive?: boolean;
  }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

    const res = await apiClient.get(`/products?${params.toString()}`);
    return res.data.data;
  },

  /**
   * Fetch single product by ID
   */
  async getProductById(id: string): Promise<Product> {
    const res = await apiClient.get(`/products/${id}`);
    return res.data.data;
  },

  /**
   * Create new product (Admin only)
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const res = await apiClient.post('/products', payload);
    return res.data.data;
  },

  /**
   * Update product (Admin only)
   */
  async updateProduct(id: string, payload: Partial<CreateProductPayload>): Promise<Product> {
    const res = await apiClient.put(`/products/${id}`, payload);
    return res.data.data;
  },

  /**
   * Delete or archive product (Admin only)
   */
  async deleteProduct(id: string): Promise<{ message: string; product?: Product }> {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data;
  },

  /**
   * Add variant to product (Admin only)
   */
  async createVariant(productId: string, payload: CreateVariantPayload): Promise<ProductVariant> {
    const res = await apiClient.post(`/products/${productId}/variants`, payload);
    return res.data.data;
  },

  /**
   * Update variant (Admin only)
   */
  async updateVariant(
    productId: string,
    variantId: string,
    payload: Partial<CreateVariantPayload>
  ): Promise<ProductVariant> {
    const res = await apiClient.put(`/products/${productId}/variants/${variantId}`, payload);
    return res.data.data;
  },

  /**
   * Delete variant (Admin only)
   */
  async deleteVariant(productId: string, variantId: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/products/${productId}/variants/${variantId}`);
    return res.data;
  },
};
