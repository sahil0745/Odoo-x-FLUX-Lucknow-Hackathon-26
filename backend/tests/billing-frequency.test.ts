import { describe, it, expect } from 'vitest';
import { BillingFrequency } from '@prisma/client';
import { billingFrequencyService } from '../src/modules/plans/billing-frequency.service';

describe('Billing Frequency Engine & Calendar Date Mathematics', () => {
  describe('Leap Year Detection', () => {
    it('identifies standard leap years divisible by 4', () => {
      expect(billingFrequencyService.isLeapYear(2020)).toBe(true);
      expect(billingFrequencyService.isLeapYear(2024)).toBe(true);
      expect(billingFrequencyService.isLeapYear(2028)).toBe(true);
    });

    it('identifies non-leap years', () => {
      expect(billingFrequencyService.isLeapYear(2021)).toBe(false);
      expect(billingFrequencyService.isLeapYear(2022)).toBe(false);
      expect(billingFrequencyService.isLeapYear(2023)).toBe(false);
      expect(billingFrequencyService.isLeapYear(2025)).toBe(false);
    });

    it('identifies century leap years and century non-leap years', () => {
      // 2000 was a leap year (divisible by 400)
      expect(billingFrequencyService.isLeapYear(2000)).toBe(true);
      // 1900, 2100 are not leap years (divisible by 100 but not 400)
      expect(billingFrequencyService.isLeapYear(1900)).toBe(false);
      expect(billingFrequencyService.isLeapYear(2100)).toBe(false);
    });
  });

  describe('Days in Month Calculations', () => {
    it('returns exact days for 31-day months', () => {
      expect(billingFrequencyService.getDaysInMonth(2024, 0)).toBe(31); // January
      expect(billingFrequencyService.getDaysInMonth(2024, 2)).toBe(31); // March
      expect(billingFrequencyService.getDaysInMonth(2024, 6)).toBe(31); // July
      expect(billingFrequencyService.getDaysInMonth(2024, 7)).toBe(31); // August
      expect(billingFrequencyService.getDaysInMonth(2024, 9)).toBe(31); // October
      expect(billingFrequencyService.getDaysInMonth(2024, 11)).toBe(31); // December
    });

    it('returns exact days for 30-day months', () => {
      expect(billingFrequencyService.getDaysInMonth(2024, 3)).toBe(30); // April
      expect(billingFrequencyService.getDaysInMonth(2024, 5)).toBe(30); // June
      expect(billingFrequencyService.getDaysInMonth(2024, 8)).toBe(30); // September
      expect(billingFrequencyService.getDaysInMonth(2024, 10)).toBe(30); // November
    });

    it('returns 29 days for February in a leap year', () => {
      expect(billingFrequencyService.getDaysInMonth(2024, 1)).toBe(29); // February 2024
    });

    it('returns 28 days for February in a non-leap year', () => {
      expect(billingFrequencyService.getDaysInMonth(2023, 1)).toBe(28); // February 2023
      expect(billingFrequencyService.getDaysInMonth(2025, 1)).toBe(28); // February 2025
    });
  });

  describe('DAILY Interval Calculations', () => {
    it('advances exactly 1 day for daily frequency', () => {
      const from = new Date(Date.UTC(2026, 0, 15, 10, 0, 0));
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.DAILY, 1);

      expect(next.toISOString()).toBe('2026-01-16T10:00:00.000Z');
    });

    it('advances multiple days according to intervalCount', () => {
      const from = new Date(Date.UTC(2026, 0, 15, 10, 0, 0));
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.DAILY, 5);

      expect(next.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    });

    it('handles month roll-over seamlessly', () => {
      const from = new Date(Date.UTC(2026, 0, 31, 10, 0, 0));
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.DAILY, 1);

      expect(next.toISOString()).toBe('2026-02-01T10:00:00.000Z');
    });
  });

  describe('WEEKLY Interval Calculations', () => {
    it('advances exactly 7 days for weekly frequency', () => {
      const from = new Date(Date.UTC(2026, 2, 1, 12, 0, 0)); // March 1, 2026
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.WEEKLY, 1);

      expect(next.toISOString()).toBe('2026-03-08T12:00:00.000Z');
    });

    it('advances 14 days for bi-weekly interval (intervalCount = 2)', () => {
      const from = new Date(Date.UTC(2026, 2, 1, 12, 0, 0));
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.WEEKLY, 2);

      expect(next.toISOString()).toBe('2026-03-15T12:00:00.000Z');
    });
  });

  describe('MONTHLY Interval Calculations & Month-End Behavior', () => {
    it('advances exactly one calendar month on regular mid-month dates', () => {
      const from = new Date(Date.UTC(2026, 0, 15, 8, 30, 0)); // Jan 15, 2026
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 1);

      expect(next.toISOString()).toBe('2026-02-15T08:30:00.000Z');
    });

    it('correctly clamps Jan 31 to Feb 29 in a LEAP YEAR (2024)', () => {
      const from = new Date(Date.UTC(2024, 0, 31, 0, 0, 0)); // Jan 31, 2024
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 1);

      expect(next.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });

    it('correctly clamps Jan 31 to Feb 28 in a NON-LEAP YEAR (2023)', () => {
      const from = new Date(Date.UTC(2023, 0, 31, 0, 0, 0)); // Jan 31, 2023
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 1);

      expect(next.toISOString()).toBe('2023-02-28T00:00:00.000Z');
    });

    it('restores original 31st anchor day after February into March', () => {
      // Base date is Feb 28 in non-leap year, but original subscription anchor day was 31
      const from = new Date(Date.UTC(2023, 1, 28, 0, 0, 0)); // Feb 28, 2023
      const next = billingFrequencyService.calculateNextBillingDate(
        from,
        BillingFrequency.MONTHLY,
        1,
        31 // Original anchor day
      );

      // March has 31 days, so anchorDay 31 must be restored!
      expect(next.toISOString()).toBe('2023-03-31T00:00:00.000Z');
    });

    it('clamps 31st anchor day to April 30', () => {
      const from = new Date(Date.UTC(2023, 2, 31, 0, 0, 0)); // March 31, 2023
      const next = billingFrequencyService.calculateNextBillingDate(
        from,
        BillingFrequency.MONTHLY,
        1,
        31
      );

      // April has only 30 days
      expect(next.toISOString()).toBe('2023-04-30T00:00:00.000Z');
    });

    it('handles quarterly intervals (intervalCount = 3)', () => {
      const from = new Date(Date.UTC(2026, 0, 10, 0, 0, 0)); // Jan 10
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 3);

      expect(next.toISOString()).toBe('2026-04-10T00:00:00.000Z'); // April 10
    });

    it('handles year transitions cleanly (e.g. November + 3 months -> February next year)', () => {
      const from = new Date(Date.UTC(2025, 10, 15, 0, 0, 0)); // Nov 15, 2025
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 3);

      expect(next.toISOString()).toBe('2026-02-15T00:00:00.000Z'); // Feb 15, 2026
    });
  });

  describe('YEARLY Interval Calculations & Leap Year Behavior', () => {
    it('advances 1 calendar year on standard dates', () => {
      const from = new Date(Date.UTC(2025, 5, 20, 14, 0, 0)); // June 20, 2025
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.YEARLY, 1);

      expect(next.toISOString()).toBe('2026-06-20T14:00:00.000Z');
    });

    it('handles Feb 29 in leap year rolling over into non-leap year (clamps to Feb 28)', () => {
      const from = new Date(Date.UTC(2024, 1, 29, 0, 0, 0)); // Feb 29, 2024 (Leap year)
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.YEARLY, 1);

      // 2025 is not a leap year, so Feb 29 clamps to Feb 28
      expect(next.toISOString()).toBe('2025-02-28T00:00:00.000Z');
    });

    it('preserves Feb 29 across 4 years into next leap year', () => {
      const from = new Date(Date.UTC(2024, 1, 29, 0, 0, 0)); // Feb 29, 2024
      const next = billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.YEARLY, 4);

      // 2028 is a leap year, so Feb 29 is preserved!
      expect(next.toISOString()).toBe('2028-02-29T00:00:00.000Z');
    });
  });

  describe('Billing Cycle Generation', () => {
    it('generates accurate period start, period end, and next billing date', () => {
      const start = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
      const cycle = billingFrequencyService.calculateBillingCycle(start, BillingFrequency.MONTHLY, 1);

      expect(cycle.periodStart.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(cycle.nextBillingDate.toISOString()).toBe('2026-02-01T00:00:00.000Z');
      expect(cycle.periodEnd.getTime()).toBe(cycle.nextBillingDate.getTime());
    });
  });

  describe('Cadence Formatting', () => {
    it('formats standard monthly cadence', () => {
      const str = billingFrequencyService.formatBillingCadence('1000.00', BillingFrequency.MONTHLY, 1);
      expect(str).toBe('1000.00 / Monthly');
    });

    it('formats cadence with currency symbol', () => {
      const str = billingFrequencyService.formatBillingCadence(
        '1000.00',
        BillingFrequency.MONTHLY,
        1,
        'USD'
      );
      expect(str).toBe('USD 1000.00 / Monthly');
    });

    it('formats multi-unit intervals', () => {
      const str = billingFrequencyService.formatBillingCadence(
        '250.00',
        BillingFrequency.MONTHLY,
        3,
        'EUR'
      );
      expect(str).toBe('EUR 250.00 / Every 3 Months');
    });

    it('formats weekly cadence', () => {
      const str = billingFrequencyService.formatBillingCadence('75.00', BillingFrequency.WEEKLY, 1);
      expect(str).toBe('75.00 / Weekly');
    });

    it('formats daily cadence', () => {
      const str = billingFrequencyService.formatBillingCadence('15.00', BillingFrequency.DAILY, 1);
      expect(str).toBe('15.00 / Daily');
    });
  });

  describe('Interval Validation Guardrails', () => {
    it('rejects zero or negative interval count', () => {
      const from = new Date();
      expect(() =>
        billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 0)
      ).toThrow(/positive integer/);

      expect(() =>
        billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, -1)
      ).toThrow(/positive integer/);
    });

    it('rejects fractional interval count', () => {
      const from = new Date();
      expect(() =>
        billingFrequencyService.calculateNextBillingDate(from, BillingFrequency.MONTHLY, 1.5)
      ).toThrow(/positive integer/);
    });
  });
});
