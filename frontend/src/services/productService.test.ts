import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from './productService';
import { apiClient } from './api';

describe('Frontend Product Service & Client Pricing Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches product listing with correct query parameters', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          {
            id: 'p-1',
            name: 'Odoo ERP Core',
            type: 'SOFTWARE',
            salesPrice: '1000.00',
            isActive: true,
            createdAt: '2026-10-31T00:00:00.000Z',
            updatedAt: '2026-10-31T00:00:00.000Z',
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockResponse as any);

    const result = await productService.getProducts({
      page: 1,
      limit: 10,
      search: 'Odoo',
      type: 'SOFTWARE',
      isActive: true,
    });

    expect(getSpy).toHaveBeenCalledWith('/products', {
      params: {
        page: 1,
        limit: 10,
        search: 'Odoo',
        type: 'SOFTWARE',
        isActive: true,
      },
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Odoo ERP Core');
    expect(result.data[0].salesPrice).toBe('1000.00');
  });

  it('executes calculatePrice API call with selected variant IDs (1000 + 560 = 1560)', async () => {
    const mockCalculation = {
      data: {
        success: true,
        data: {
          productId: 'p-odoo',
          productName: 'Odoo Base',
          baseSalesPrice: '1000.00',
          selectedVariants: [
            {
              variantId: 'v-enterprise',
              variantType: 'Brand',
              variantValue: 'Odoo Enterprise',
              additionalPrice: '560.00',
            },
          ],
          totalVariantAdditions: '560.00',
          finalPrice: '1560.00',
          currency: 'USD',
        },
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockCalculation as any);

    const result = await productService.calculatePrice('p-odoo', ['v-enterprise']);

    expect(postSpy).toHaveBeenCalledWith('/products/p-odoo/calculate-price', {
      selectedVariantIds: ['v-enterprise'],
    });

    expect(result.baseSalesPrice).toBe('1000.00');
    expect(result.totalVariantAdditions).toBe('560.00');
    expect(result.finalPrice).toBe('1560.00');
    expect(result.selectedVariants[0].variantValue).toBe('Odoo Enterprise');
  });

  it('creates product and sends correctly formatted payload', async () => {
    const payload = {
      name: 'Analytics Suite',
      type: 'SOFTWARE' as const,
      salesPrice: '500.00',
      costPrice: '150.00',
      notes: 'Initial launch',
      isActive: true,
      variants: [
        {
          variantType: 'Tier',
          variantValue: 'Pro',
          additionalPrice: '150.00',
        },
      ],
    };

    const mockResponse = {
      data: {
        success: true,
        data: { id: 'new-id', ...payload },
      },
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse as any);

    const created = await productService.createProduct(payload);

    expect(postSpy).toHaveBeenCalledWith('/products', payload);
    expect(created.id).toBe('new-id');
  });

  it('calls updateProductStatus to toggle active state', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 'p-1', isActive: false },
      },
    };

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue(mockResponse as any);

    const updated = await productService.updateProductStatus('p-1', false);

    expect(patchSpy).toHaveBeenCalledWith('/products/p-1/status', { isActive: false });
    expect(updated.isActive).toBe(false);
  });
});
