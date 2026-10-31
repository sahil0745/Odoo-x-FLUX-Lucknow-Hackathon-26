import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { productPricingService } from '../src/modules/products/product-pricing.service';
import { ValidationError } from '../src/utils/AppError';

describe('Product Pricing Engine & Financial Precision', () => {
  it('calculates standard base price + single variant addition (1000.00 + 560.00 = 1560.00)', () => {
    const basePrice = '1000.00';
    const variants = [
      {
        id: 'var-1',
        productId: 'prod-1',
        variantType: 'Brand',
        variantValue: 'Odoo',
        additionalPrice: '560.00',
        isActive: true,
      },
    ];

    const result = productPricingService.calculateProductPrice(basePrice, variants, 'prod-1');

    expect(result.basePrice).toBe('1000.00');
    expect(result.totalVariantAdditions).toBe('560.00');
    expect(result.finalPrice).toBe('1560.00');
    expect(result.selectedVariants).toHaveLength(1);
    expect(result.selectedVariants[0].variantValue).toBe('Odoo');
  });

  it('calculates multiple additive variants accurately without floating-point errors', () => {
    // Classic JavaScript bug: 0.10 + 0.20 !== 0.30 in IEEE 754 float
    const basePrice = '0.10';
    const variants = [
      {
        id: 'var-1',
        productId: 'prod-1',
        variantType: 'Feature',
        variantValue: 'Cloud Storage',
        additionalPrice: '0.20',
        isActive: true,
      },
    ];

    const result = productPricingService.calculateProductPrice(basePrice, variants, 'prod-1');

    expect(result.basePrice).toBe('0.10');
    expect(result.totalVariantAdditions).toBe('0.20');
    expect(result.finalPrice).toBe('0.30'); // Exact decimal precision
  });

  it('supports base price with zero variant additions', () => {
    const result = productPricingService.calculateProductPrice('249.99', [], 'prod-1');

    expect(result.basePrice).toBe('249.99');
    expect(result.totalVariantAdditions).toBe('0.00');
    expect(result.finalPrice).toBe('249.99');
    expect(result.selectedVariants).toHaveLength(0);
  });

  it('rejects duplicate variant selections', () => {
    const basePrice = '500.00';
    const variants = [
      {
        id: 'var-dup',
        productId: 'prod-1',
        variantType: 'Tier',
        variantValue: 'Pro',
        additionalPrice: '100.00',
        isActive: true,
      },
      {
        id: 'var-dup', // Duplicate ID
        productId: 'prod-1',
        variantType: 'Tier',
        variantValue: 'Pro',
        additionalPrice: '100.00',
        isActive: true,
      },
    ];

    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-1')
    ).toThrow(ValidationError);
    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-1')
    ).toThrow(/duplicate variant selected/i);
  });

  it('rejects variants belonging to another product', () => {
    const basePrice = '1000.00';
    const variants = [
      {
        id: 'var-foreign',
        productId: 'prod-OTHER', // Belongs to different product
        variantType: 'Brand',
        variantValue: 'Odoo',
        additionalPrice: '560.00',
        isActive: true,
      },
    ];

    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-TARGET')
    ).toThrow(ValidationError);
    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-TARGET')
    ).toThrow(/does not belong to product/i);
  });

  it('rejects inactive variants from price calculation', () => {
    const basePrice = '1000.00';
    const variants = [
      {
        id: 'var-inactive',
        productId: 'prod-1',
        variantType: 'Configuration',
        variantValue: 'Legacy Option',
        additionalPrice: '150.00',
        isActive: false, // Inactive
      },
    ];

    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-1')
    ).toThrow(ValidationError);
    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-1')
    ).toThrow(/inactive variant/i);
  });

  it('rejects conflicting selections within the same variant type category', () => {
    const basePrice = '1000.00';
    const variants = [
      {
        id: 'var-ed-1',
        productId: 'prod-1',
        variantType: 'Edition',
        variantValue: 'Standard',
        additionalPrice: '100.00',
        isActive: true,
      },
      {
        id: 'var-ed-2',
        productId: 'prod-1',
        variantType: 'Edition', // Conflicting edition
        variantValue: 'Enterprise',
        additionalPrice: '500.00',
        isActive: true,
      },
    ];

    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-1')
    ).toThrow(ValidationError);
    expect(() =>
      productPricingService.calculateProductPrice(basePrice, variants, 'prod-1')
    ).toThrow(/conflicting variant selection/i);
  });

  it('rejects negative base prices or invalid numeric strings', () => {
    expect(() =>
      productPricingService.calculateProductPrice('-100.00', [], 'prod-1')
    ).toThrow(ValidationError);

    expect(() =>
      productPricingService.calculateProductPrice('not-a-number', [], 'prod-1')
    ).toThrow(ValidationError);
  });
});
