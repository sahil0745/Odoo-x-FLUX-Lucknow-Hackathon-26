import { BillingFrequency } from '@prisma/client';

export interface CreateSubscriptionPlanDto {
  name: string;
  description?: string;
  price: number;
  billingFrequency: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom?: Date | string;
  availableUntil?: Date | string | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
}

export interface UpdateSubscriptionPlanDto {
  name?: string;
  description?: string | null;
  price?: number;
  billingFrequency?: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom?: Date | string;
  availableUntil?: Date | string | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
}
