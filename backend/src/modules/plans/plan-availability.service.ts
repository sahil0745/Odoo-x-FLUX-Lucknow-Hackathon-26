import { ValidationError } from '../../utils/AppError';

export type PlanAvailabilityStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'INACTIVE';

export interface PlanAvailabilityResult {
  isAvailable: boolean;
  status: PlanAvailabilityStatus;
  reason?: string;
  availableFrom: Date;
  availableUntil?: Date | null;
  allowAutoClose: boolean;
  allowEarlyClose: boolean;
}

export interface PlanAvailabilityInput {
  isActive: boolean;
  availableFrom: Date;
  availableUntil?: Date | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
}

export class PlanAvailabilityService {
  /**
   * Check whether a plan is currently available for new quotations and subscriptions.
   *
   * Business Rules:
   * 1. Inactive plans are never available.
   * 2. If targetDate < availableFrom, the plan is UPCOMING.
   * 3. If targetDate > availableUntil, the plan is EXPIRED.
   * 4. Otherwise, the plan is ACTIVE and open for subscription.
   */
  checkPlanAvailability(
    plan: PlanAvailabilityInput,
    targetDate: Date = new Date()
  ): PlanAvailabilityResult {
    const from = new Date(plan.availableFrom);
    const until = plan.availableUntil ? new Date(plan.availableUntil) : null;
    const now = targetDate.getTime();

    if (!plan.isActive) {
      return {
        isAvailable: false,
        status: 'INACTIVE',
        reason: 'Plan has been deactivated by an administrator and cannot be selected for new purchases.',
        availableFrom: from,
        availableUntil: until,
        allowAutoClose: plan.allowAutoClose ?? false,
        allowEarlyClose: plan.allowEarlyClose ?? true,
      };
    }

    if (now < from.getTime()) {
      return {
        isAvailable: false,
        status: 'UPCOMING',
        reason: `Plan is not yet available for subscription. Availability begins on ${from.toISOString().split('T')[0]}.`,
        availableFrom: from,
        availableUntil: until,
        allowAutoClose: plan.allowAutoClose ?? false,
        allowEarlyClose: plan.allowEarlyClose ?? true,
      };
    }

    if (until && now > until.getTime()) {
      return {
        isAvailable: false,
        status: 'EXPIRED',
        reason: `Plan has passed its availability window. It expired on ${until.toISOString().split('T')[0]}.`,
        availableFrom: from,
        availableUntil: until,
        allowAutoClose: plan.allowAutoClose ?? false,
        allowEarlyClose: plan.allowEarlyClose ?? true,
      };
    }

    return {
      isAvailable: true,
      status: 'ACTIVE',
      availableFrom: from,
      availableUntil: until,
      allowAutoClose: plan.allowAutoClose ?? false,
      allowEarlyClose: plan.allowEarlyClose ?? true,
    };
  }

  /**
   * Validate that the date window is logically sound.
   * availableUntil cannot precede availableFrom.
   */
  validateDateWindow(availableFrom: Date, availableUntil?: Date | null): void {
    if (availableUntil) {
      const from = new Date(availableFrom);
      const until = new Date(availableUntil);

      if (until.getTime() < from.getTime()) {
        throw new ValidationError(
          `Availability end date (${until.toISOString().split('T')[0]}) cannot precede start date (${from.toISOString().split('T')[0]}).`
        );
      }
    }
  }

  /**
   * Assert plan is available, throwing ValidationError if unavailable.
   */
  assertPlanAvailable(plan: PlanAvailabilityInput, targetDate: Date = new Date()): void {
    const result = this.checkPlanAvailability(plan, targetDate);
    if (!result.isAvailable) {
      throw new ValidationError(result.reason || 'Subscription plan is currently unavailable');
    }
  }
}

export const planAvailabilityService = new PlanAvailabilityService();
