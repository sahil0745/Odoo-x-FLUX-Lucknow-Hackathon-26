import { BillingFrequency } from '@prisma/client';
import { PlanAvailabilityStatus } from './plan-availability.service';

export interface AssociatedProductSummary {
  id: string;
  name: string;
  type: string;
  salesPrice: string;
}

export interface CreatePlanDto {
  name: string;
  description?: string | null;
  price: number | string;
  billingFrequency: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom: string | Date;
  availableUntil?: string | Date | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
  associatedProductIds?: string[];
}

export interface UpdatePlanDto {
  name?: string;
  description?: string | null;
  price?: number | string;
  billingFrequency?: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom?: string | Date;
  availableUntil?: string | Date | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
}

export interface UpdatePlanStatusDto {
  isActive: boolean;
}

export interface ListPlansQuery {
  page?: number;
  limit?: number;
  search?: string;
  billingFrequency?: BillingFrequency;
  isActive?: boolean;
  availability?: 'all' | 'available' | 'upcoming' | 'expired';
  sortBy?: 'name' | 'price' | 'createdAt' | 'billingFrequency' | 'minimumQuantity';
  sortOrder?: 'asc' | 'desc';
}

export interface ValidatePlanQuantityDto {
  quantity: number;
}

export interface CalculateNextBillingDateDto {
  startDate: string | Date;
  billingFrequency: BillingFrequency;
  intervalCount?: number;
  anchorDay?: number;
}

export interface PlanResponse {
  id: string;
  name: string;
  description: string | null;
  price: string;
  billingFrequency: BillingFrequency;
  intervalCount: number;
  minimumQuantity: number;
  availableFrom: Date;
  availableUntil: Date | null;
  allowAutoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  isActive: boolean;
  currency: string;
  cadenceFormatted: string;
  availabilityStatus: PlanAvailabilityStatus;
  isAvailable: boolean;
  activeSubscriptionCount?: number;
  associatedTemplatesCount?: number;
  associatedProducts?: AssociatedProductSummary[];
  createdAt: Date;
  updatedAt: Date;
}
