import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from './productService';
import { planService } from './planService';
import { apiClient } from './api';

describe('Catalog & Subscription Plan Services (M02 & M03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('productService', () => {
    it('fetches products catalog correctly', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Brightloop ERP Core',
          type: 'SOFTWARE',
          salesPrice: 1000,
          costPrice: 400,
          marginPercent: 60,
          isActive: true,
          variants: [
            {
              id: 'var-1',
              productId: 'prod-1',
              variantType: 'Brand',
              variantValue: 'Odoo',
              additionalPrice: 560,
              effectivePrice: 1560,
              isActive: true,
            },
          ],
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: { success: true, data: mockProducts },
      } as any);

      const result = await productService.listProducts({ type: 'SOFTWARE' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Brightloop ERP Core');
      expect(result[0].variants?.[0].effectivePrice).toBe(1560);
    });

    it('creates product via POST /products', async () => {
      const newProduct = {
        name: 'Analytics Pro',
        type: 'SERVICE' as const,
        salesPrice: 300,
        costPrice: 100,
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { success: true, data: { id: 'prod-2', ...newProduct, isActive: true } },
      } as any);

      const created = await productService.createProduct(newProduct);
      expect(created.id).toBe('prod-2');
      expect(created.salesPrice).toBe(300);
    });
  });

  describe('planService', () => {
    it('fetches plans with cadence filtering', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Startup Monthly',
          price: 99,
          billingFrequency: 'MONTHLY',
          intervalCount: 1,
          minimumQuantity: 1,
          allowAutoClose: false,
          allowEarlyClose: true,
          allowPause: false,
          allowRenewal: true,
          isActive: true,
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: { success: true, data: mockPlans },
      } as any);

      const result = await planService.listPlans({ billingFrequency: 'MONTHLY' });
      expect(result).toHaveLength(1);
      expect(result[0].billingFrequency).toBe('MONTHLY');
      expect(result[0].price).toBe(99);
    });

    it('creates plan via POST /plans', async () => {
      const newPlan = {
        name: 'Enterprise Yearly',
        price: 1200,
        billingFrequency: 'YEARLY' as const,
        intervalCount: 1,
        minimumQuantity: 5,
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { success: true, data: { id: 'plan-2', ...newPlan, isActive: true } },
      } as any);

      const created = await planService.createPlan(newPlan);
      expect(created.id).toBe('plan-2');
      expect(created.billingFrequency).toBe('YEARLY');
    });
  });
});
