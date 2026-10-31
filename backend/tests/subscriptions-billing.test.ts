import { describe, it, expect } from 'vitest';
import { BillingFrequency } from '@prisma/client';
import { subscriptionService } from '../src/modules/subscriptions/subscriptions.service';

describe('Subscription Lifecycle & Next Billing Calculation', () => {
  it('correctly advances DAILY billing frequency', () => {
    const base = new Date('2026-05-01T00:00:00.000Z');
    const next = subscriptionService.calculateNextBillingDate(base, BillingFrequency.DAILY, 1);
    expect(next.getUTCDate()).toBe(2);
    expect(next.getUTCMonth()).toBe(4); // May (0-indexed)
  });

  it('correctly advances WEEKLY billing frequency', () => {
    const base = new Date('2026-05-01T00:00:00.000Z');
    const next = subscriptionService.calculateNextBillingDate(base, BillingFrequency.WEEKLY, 1);
    expect(next.getUTCDate()).toBe(8);
  });

  it('correctly advances MONTHLY billing frequency', () => {
    const base = new Date('2026-05-15T00:00:00.000Z');
    const next = subscriptionService.calculateNextBillingDate(base, BillingFrequency.MONTHLY, 1);
    expect(next.getUTCMonth()).toBe(5); // June
    expect(next.getUTCDate()).toBe(15);
  });

  it('correctly advances Quarterly (3-Month interval) billing frequency', () => {
    const base = new Date('2026-01-10T00:00:00.000Z');
    const next = subscriptionService.calculateNextBillingDate(base, BillingFrequency.MONTHLY, 3);
    expect(next.getUTCMonth()).toBe(3); // April
    expect(next.getUTCDate()).toBe(10);
  });

  it('correctly advances YEARLY billing frequency', () => {
    const base = new Date('2026-03-01T00:00:00.000Z');
    const next = subscriptionService.calculateNextBillingDate(base, BillingFrequency.YEARLY, 1);
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(2); // March
  });
});

