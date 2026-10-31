import { describe, it, expect } from 'vitest';
import { planQuantityService } from '../src/modules/plans/plan-quantity.service';
import { planAvailabilityService } from '../src/modules/plans/plan-availability.service';
import { ValidationError } from '../src/utils/AppError';

describe('Plan Minimum Quantity & Availability Rules Suite', () => {
  describe('Minimum Quantity Validation Engine', () => {
    const minQty = 5;

    it('accepts quantity strictly greater than plan minimum (10 > 5)', () => {
      const result = planQuantityService.validateQuantity(10, minQty);
      expect(result.isValid).toBe(true);
      expect(result.requestedQuantity).toBe(10);
      expect(result.minimumQuantity).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('accepts quantity exactly equal to plan minimum (5 == 5)', () => {
      const result = planQuantityService.validateQuantity(5, minQty);
      expect(result.isValid).toBe(true);
      expect(result.requestedQuantity).toBe(5);
      expect(result.minimumQuantity).toBe(5);
    });

    it('rejects quantity strictly below plan minimum (3 < 5)', () => {
      const result = planQuantityService.validateQuantity(3, minQty);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('is below the plan minimum required quantity (5)');
    });

    it('rejects zero quantity (0 < 1)', () => {
      const result = planQuantityService.validateQuantity(0, minQty);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be at least 1');
    });

    it('rejects negative quantity (-2)', () => {
      const result = planQuantityService.validateQuantity(-2, minQty);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be at least 1');
    });

    it('rejects fractional quantity (5.5)', () => {
      const result = planQuantityService.validateQuantity(5.5, minQty);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Fractional quantities (5.5) are not allowed');
    });

    it('rejects non-numeric NaN values', () => {
      const result = planQuantityService.validateQuantity(NaN, minQty);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a valid number');
    });

    it('assertValidQuantity throws ValidationError on violation', () => {
      expect(() => planQuantityService.assertValidQuantity(2, 5)).toThrow(ValidationError);
      expect(() => planQuantityService.assertValidQuantity(2, 5)).toThrow(/below the plan minimum/);
    });

    it('assertValidQuantity passes quietly on compliant quantity', () => {
      expect(() => planQuantityService.assertValidQuantity(5, 5)).not.toThrow();
      expect(() => planQuantityService.assertValidQuantity(12, 5)).not.toThrow();
    });
  });

  describe('Plan Availability & Window Rules', () => {
    const fixedNow = new Date('2026-06-15T12:00:00Z');

    it('identifies plan as ACTIVE when active and current date is within availability window', () => {
      const plan = {
        isActive: true,
        availableFrom: new Date('2026-01-01T00:00:00Z'),
        availableUntil: new Date('2026-12-31T23:59:59Z'),
        allowAutoClose: false,
        allowEarlyClose: true,
      };

      const result = planAvailabilityService.checkPlanAvailability(plan, fixedNow);
      expect(result.isAvailable).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.reason).toBeUndefined();
    });

    it('identifies plan as ACTIVE when availableUntil is null (unbounded lifetime)', () => {
      const plan = {
        isActive: true,
        availableFrom: new Date('2026-01-01T00:00:00Z'),
        availableUntil: null,
      };

      const result = planAvailabilityService.checkPlanAvailability(plan, fixedNow);
      expect(result.isAvailable).toBe(true);
      expect(result.status).toBe('ACTIVE');
    });

    it('identifies plan as INACTIVE when isActive is false regardless of dates', () => {
      const plan = {
        isActive: false,
        availableFrom: new Date('2026-01-01T00:00:00Z'),
        availableUntil: new Date('2026-12-31T23:59:59Z'),
      };

      const result = planAvailabilityService.checkPlanAvailability(plan, fixedNow);
      expect(result.isAvailable).toBe(false);
      expect(result.status).toBe('INACTIVE');
      expect(result.reason).toContain('deactivated by an administrator');
    });

    it('identifies plan as UPCOMING before its availableFrom date', () => {
      const plan = {
        isActive: true,
        availableFrom: new Date('2026-07-01T00:00:00Z'), // Future date relative to June 15
        availableUntil: new Date('2026-12-31T23:59:59Z'),
      };

      const result = planAvailabilityService.checkPlanAvailability(plan, fixedNow);
      expect(result.isAvailable).toBe(false);
      expect(result.status).toBe('UPCOMING');
      expect(result.reason).toContain('Availability begins on 2026-07-01');
    });

    it('identifies plan as EXPIRED after its availableUntil date', () => {
      const plan = {
        isActive: true,
        availableFrom: new Date('2026-01-01T00:00:00Z'),
        availableUntil: new Date('2026-05-31T23:59:59Z'), // Past date relative to June 15
      };

      const result = planAvailabilityService.checkPlanAvailability(plan, fixedNow);
      expect(result.isAvailable).toBe(false);
      expect(result.status).toBe('EXPIRED');
      expect(result.reason).toContain('expired on 2026-05-31');
    });

    it('preserves automatic and early closing configurations in availability result', () => {
      const plan = {
        isActive: true,
        availableFrom: new Date('2026-01-01T00:00:00Z'),
        allowAutoClose: true,
        allowEarlyClose: false,
      };

      const result = planAvailabilityService.checkPlanAvailability(plan, fixedNow);
      expect(result.allowAutoClose).toBe(true);
      expect(result.allowEarlyClose).toBe(false);
    });

    it('validates date window and rejects when availableUntil precedes availableFrom', () => {
      const from = new Date('2026-10-01T00:00:00Z');
      const until = new Date('2026-09-01T00:00:00Z'); // 1 month prior!

      expect(() => planAvailabilityService.validateDateWindow(from, until)).toThrow(
        ValidationError
      );
      expect(() => planAvailabilityService.validateDateWindow(from, until)).toThrow(
        /cannot precede start date/
      );
    });

    it('accepts date window when availableUntil is equal to or after availableFrom', () => {
      const from = new Date('2026-10-01T00:00:00Z');
      const sameUntil = new Date('2026-10-01T00:00:00Z');
      const futureUntil = new Date('2026-11-01T00:00:00Z');

      expect(() => planAvailabilityService.validateDateWindow(from, sameUntil)).not.toThrow();
      expect(() => planAvailabilityService.validateDateWindow(from, futureUntil)).not.toThrow();
      expect(() => planAvailabilityService.validateDateWindow(from, null)).not.toThrow();
    });
  });
});
