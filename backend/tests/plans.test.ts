import { describe, it, expect } from 'vitest';
import { BillingFrequency } from '@prisma/client';
import { createPlanSchema, planQuerySchema } from '../src/modules/plans/plans.validation';

describe('Subscription Plans Domain Tests', () => {
  it('validates a standard monthly recurring plan', () => {
    const payload = {
      name: 'Professional Monthly',
      description: 'For growing teams',
      price: 99.0,
      billingFrequency: BillingFrequency.MONTHLY,
      intervalCount: 1,
      allowPause: true,
      allowRenewal: true,
      allowEarlyClose: true,
    };

    const parsed = createPlanSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates a multi-interval quarterly plan', () => {
    const payload = {
      name: 'Quarterly Enterprise',
      price: 285.0,
      billingFrequency: BillingFrequency.MONTHLY,
      intervalCount: 3,
    };

    const parsed = createPlanSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.intervalCount).toBe(3);
    }
  });

  it('rejects plan with negative price or zero interval count', () => {
    expect(createPlanSchema.safeParse({ name: 'Bad Plan', price: -10 }).success).toBe(false);
    expect(createPlanSchema.safeParse({ name: 'Bad Interval', price: 50, intervalCount: 0 }).success).toBe(false);
  });
});

