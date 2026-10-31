import { apiClient } from './api';
import {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  CreateVariantPayload,
  ProductVariant,
  PriceCalculationResult,
  PaginationMeta,
  ProductType,
} from '../types';

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: PaginationMeta;
}

export interface SingleProductResponse {
  success: boolean;
  data: Product;
}

export interface SingleVariantResponse {
  success: boolean;
  data: ProductVariant;
}

export interface CalculatePriceResponse {
  success: boolean;
  data: PriceCalculationResult;
}

export const productService = {
  /**
   * Fetch paginated list of products with optional filters & search
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: ProductType | string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ProductListResponse> {
    const response = await apiClient.get<ProductListResponse>('/products', {
      params,
    });
    return response.data;
  },

  /**
   * Backward-compatible list helper used by catalog pages/tests.
   */
  async listProducts(filters?: {
    search?: string;
    type?: ProductType;
    isActive?: boolean;
  }): Promise<Product[]> {
    const response = await apiClient.get<{ success: boolean; data: Product[] }>('/products', {
      params: filters,
    });
    return response.data.data;
  },

  /**
   * Fetch single product with its active/all variants
   */
  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<SingleProductResponse>(`/products/${id}`);
    return response.data.data;
  },

  /**
   * Create a new product (Admin only)
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const response = await apiClient.post<SingleProductResponse>('/products', payload);
    return response.data.data;
  },

  /**
   * Update product attributes (Admin only)
   */
  async updateProduct(
    id: string,
    payload: UpdateProductPayload | Partial<CreateProductPayload>
  ): Promise<Product> {
    const response = await apiClient.patch<SingleProductResponse>(`/products/${id}`, payload);
    return response.data.data;
  },

  /**
   * Toggle product active/inactive status (Admin only)
   */
  async updateProductStatus(id: string, isActive: boolean): Promise<Product> {
    const response = await apiClient.patch<SingleProductResponse>(`/products/${id}/status`, {
      isActive,
    });
    return response.data.data;
  },

  /**
   * Delete or archive product (Admin only)
   */
  async deleteProduct(id: string): Promise<{ success?: boolean; message: string; product?: Product }> {
    const response = await apiClient.delete<{ success?: boolean; message: string; product?: Product }>(
      `/products/${id}`
    );
    return response.data;
  },

  /**
   * Add a new variant to a product (Admin only)
   */
  async createVariant(productId: string, payload: CreateVariantPayload): Promise<ProductVariant> {
    const response = await apiClient.post<SingleVariantResponse>(`/products/${productId}/variants`, payload);
    return response.data.data;
  },

  /**
   * Update an existing variant (Admin only)
   */
  async updateVariant(
    productId: string,
    variantId: string,
    payload: Partial<CreateVariantPayload> & { isActive?: boolean }
  ): Promise<ProductVariant> {
    const response = await apiClient.patch<SingleVariantResponse>(
      `/products/${productId}/variants/${variantId}`,
      payload
    );
    return response.data.data;
  },

  /**
   * Delete a variant with historical reference guard (Admin only)
   */
  async deleteVariant(
    productId: string,
    variantId: string
  ): Promise<{ success?: boolean; message: string }> {
    const response = await apiClient.delete<{ success?: boolean; message: string }>(
      `/products/${productId}/variants/${variantId}`
    );
    return response.data;
  },

  /**
   * Calculate live selling price with selected variant add-ons
   */
  async calculatePrice(productId: string, selectedVariantIds: string[]): Promise<PriceCalculationResult> {
    const response = await apiClient.post<CalculatePriceResponse>(`/products/${productId}/calculate-price`, {
      selectedVariantIds,
    });
    return response.data.data;
  },
};
