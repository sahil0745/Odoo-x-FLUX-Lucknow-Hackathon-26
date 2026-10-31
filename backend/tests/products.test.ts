import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  createProductSchema,
  createProductVariantSchema,
  productQuerySchema,
} from '../src/modules/products/products.validation';

describe('Products & Variants Domain Tests', () => {
  it('validates a correct product payload', () => {
    const payload = {
      name: 'Brightloop ERP Core',
      type: 'SOFTWARE',
      salesPrice: 1500.0,
      costPrice: 500.0,
      notes: 'Enterprise ERP core edition',
      isActive: true,
    };

    const parsed = createProductSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects product with negative price', () => {
    const payload = {
      name: 'Brightloop Add-on',
      salesPrice: -50,
    };

    const parsed = createProductSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('validates additive variant creation schema', () => {
    const variantPayload = {
      variantType: 'Edition',
      variantValue: 'Enterprise Plus',
      additionalPrice: 450.0,
      isActive: true,
    };

    const parsed = createProductVariantSchema.safeParse(variantPayload);
    expect(parsed.success).toBe(true);
  });

  it('calculates combined product and variant additive pricing using Prisma Decimal', () => {
    const baseSalesPrice = new Prisma.Decimal('1200.00');
    const editionVariantSurcharge = new Prisma.Decimal('350.50');
    const finalPrice = baseSalesPrice.plus(editionVariantSurcharge);

    expect(finalPrice.toFixed(2)).toBe('1550.50');
  });

  it('validates query filter schemas and transforms boolean string', () => {
    const query = {
      search: 'ERP',
      isActive: 'true',
      page: '2',
      limit: '10',
    };

    const parsed = productQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBe(true);
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.limit).toBe(10);
    }
  });
});

