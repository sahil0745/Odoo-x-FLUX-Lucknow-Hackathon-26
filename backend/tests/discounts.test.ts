import { describe, it, expect } from 'vitest';
import { DiscountType, DiscountScope } from '@prisma/client';
import { createDiscountSchema, validateDiscountSchema } from '../src/modules/discounts/discounts.validation';

describe('Discounts Domain Validation Tests', () => {
  it('validates a percentage-based coupon discount', () => {
    const payload = {
      name: 'Launch Special 25% Off',
      code: 'LAUNCH25',
      discountType: DiscountType.PERCENTAGE,
      value: 25.0,
      scope: DiscountScope.SUBSCRIPTION,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      minPurchaseAmount: 100.0,
      maxUsageLimit: 500,
    };

    const parsed = createDiscountSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.code).toBe('LAUNCH25');
    }
  });

  it('validates fixed amount rebate', () => {
    const payload = {
      name: 'Flat $50 Rebate',
      code: 'REBATE50',
      discountType: DiscountType.FIXED,
      value: 50.0,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    };

    const parsed = createDiscountSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('normalizes coupon code to uppercase', () => {
    const parsed = validateDiscountSchema.safeParse({ code: 'promo-code-2026' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.code).toBe('PROMO-CODE-2026');
    }
  });
});

