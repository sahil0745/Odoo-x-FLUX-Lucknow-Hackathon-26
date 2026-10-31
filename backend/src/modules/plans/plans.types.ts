import { BillingFrequency } from '@prisma/client';

export interface CreatePlanDto {
  name: string;
  description?: string;
  price: number | string;
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

export interface UpdatePlanDto {
  name?: string;
  description?: string;
  price?: number | string;
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

export interface PlanQueryFilters {
  billingFrequency?: BillingFrequency;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

