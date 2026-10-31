import { BillingFrequency } from '@prisma/client';

export interface BillingCycle {
  periodStart: Date;
  periodEnd: Date;
  nextBillingDate: Date;
}

export class BillingFrequencyService {
  /**
   * Check whether a given calendar year is a leap year.
   * A year is a leap year if divisible by 4, except end-of-century years which must be divisible by 400.
   */
  isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Return the exact number of calendar days in a specific month of a specific year.
   * @param year Full year (e.g. 2024, 2025, 2026)
   * @param monthZeroIndexed Month index (0 for January, 1 for February, ..., 11 for December)
   */
  getDaysInMonth(year: number, monthZeroIndexed: number): number {
    // Normalizing month to 0-11 range
    const normalizedDate = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
    return normalizedDate.getUTCDate();
  }

  /**
   * Calculate the next recurring billing date given a base date, billing frequency, and interval.
   * Uses UTC arithmetic to avoid daylight savings time (DST) shifts.
   *
   * Month-end handling:
   * - If starting on Jan 31, +1 month -> Feb 28 (or Feb 29 in leap year).
   * - When anchorDay is 31, the following cycle (+1 month from Feb) restores March 31!
   * - April clamps to April 30.
   *
   * Leap-year handling:
   * - Feb 29 + 1 year -> Feb 28 in non-leap year.
   * - Feb 29 + 4 years -> Feb 29 in next leap year.
   *
   * @param fromDate The starting reference date
   * @param frequency DAILY, WEEKLY, MONTHLY, or YEARLY
   * @param intervalCount Step multiplier (default 1)
   * @param anchorDay Optional original anchor day of month (1-31) to preserve month-end intention
   */
  calculateNextBillingDate(
    fromDate: Date,
    frequency: BillingFrequency,
    intervalCount: number = 1,
    anchorDay?: number
  ): Date {
    if (intervalCount < 1 || !Number.isInteger(intervalCount)) {
      throw new Error(`Interval count must be a positive integer, received: ${intervalCount}`);
    }

    const nextDate = new Date(fromDate.getTime());
    const effectiveAnchorDay = anchorDay ?? fromDate.getUTCDate();

    switch (frequency) {
      case BillingFrequency.DAILY: {
        nextDate.setUTCDate(nextDate.getUTCDate() + intervalCount);
        return nextDate;
      }

      case BillingFrequency.WEEKLY: {
        nextDate.setUTCDate(nextDate.getUTCDate() + intervalCount * 7);
        return nextDate;
      }

      case BillingFrequency.MONTHLY: {
        const currentYear = fromDate.getUTCFullYear();
        const currentMonth = fromDate.getUTCMonth();

        // Calculate target year and month
        const totalMonths = currentMonth + intervalCount;
        const targetYear = currentYear + Math.floor(totalMonths / 12);
        const targetMonth = ((totalMonths % 12) + 12) % 12;

        // Get max days in target month
        const maxDaysInTargetMonth = this.getDaysInMonth(targetYear, targetMonth);

        // Clamp anchor day to target month's max days
        const targetDay = Math.min(effectiveAnchorDay, maxDaysInTargetMonth);

        return new Date(
          Date.UTC(
            targetYear,
            targetMonth,
            targetDay,
            fromDate.getUTCHours(),
            fromDate.getUTCMinutes(),
            fromDate.getUTCSeconds(),
            fromDate.getUTCMilliseconds()
          )
        );
      }

      case BillingFrequency.YEARLY: {
        const targetYear = fromDate.getUTCFullYear() + intervalCount;
        const currentMonth = fromDate.getUTCMonth();

        // Handle Feb 29 in leap year targeting non-leap year
        if (currentMonth === 1 && effectiveAnchorDay === 29) {
          const isTargetLeap = this.isLeapYear(targetYear);
          const targetDay = isTargetLeap ? 29 : 28;
          return new Date(
            Date.UTC(
              targetYear,
              1,
              targetDay,
              fromDate.getUTCHours(),
              fromDate.getUTCMinutes(),
              fromDate.getUTCSeconds(),
              fromDate.getUTCMilliseconds()
            )
          );
        }

        const maxDays = this.getDaysInMonth(targetYear, currentMonth);
        const targetDay = Math.min(effectiveAnchorDay, maxDays);

        return new Date(
          Date.UTC(
            targetYear,
            currentMonth,
            targetDay,
            fromDate.getUTCHours(),
            fromDate.getUTCMinutes(),
            fromDate.getUTCSeconds(),
            fromDate.getUTCMilliseconds()
          )
        );
      }

      default:
        throw new Error(`Unsupported billing frequency: ${frequency}`);
    }
  }

  /**
   * Calculate a complete billing cycle with start date, next billing date, and cycle end boundary.
   */
  calculateBillingCycle(
    startDate: Date,
    frequency: BillingFrequency,
    intervalCount: number = 1,
    anchorDay?: number
  ): BillingCycle {
    const nextBillingDate = this.calculateNextBillingDate(
      startDate,
      frequency,
      intervalCount,
      anchorDay
    );

    // Period end is the exact boundary before the next billing cycle begins
    const periodEnd = new Date(nextBillingDate.getTime());

    return {
      periodStart: new Date(startDate.getTime()),
      periodEnd,
      nextBillingDate,
    };
  }

  /**
   * Format human-readable billing frequency description.
   * e.g. "1000.00 / Monthly" or "250.00 / Every 3 Months"
   */
  formatBillingCadence(
    price: string | number,
    frequency: BillingFrequency,
    intervalCount: number = 1,
    currency?: string
  ): string {
    const prefix = currency ? `${currency} ` : '';
    const formattedPrice = typeof price === 'number' ? price.toFixed(2) : price;

    if (intervalCount === 1) {
      const labels: Record<BillingFrequency, string> = {
        [BillingFrequency.DAILY]: 'Daily',
        [BillingFrequency.WEEKLY]: 'Weekly',
        [BillingFrequency.MONTHLY]: 'Monthly',
        [BillingFrequency.YEARLY]: 'Yearly',
      };
      return `${prefix}${formattedPrice} / ${labels[frequency]}`;
    }

    const unitLabels: Record<BillingFrequency, string> = {
      [BillingFrequency.DAILY]: 'Days',
      [BillingFrequency.WEEKLY]: 'Weeks',
      [BillingFrequency.MONTHLY]: 'Months',
      [BillingFrequency.YEARLY]: 'Years',
    };

    return `${prefix}${formattedPrice} / Every ${intervalCount} ${unitLabels[frequency]}`;
  }
}

export const billingFrequencyService = new BillingFrequencyService();
