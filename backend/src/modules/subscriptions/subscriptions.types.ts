import { SubscriptionStatus } from '@prisma/client';

export interface CreateSubscriptionLineDto {
  productId: string;
  variantId?: string | null;
  taxRuleId?: string | null;
  quantity: number;
  unitPrice?: number | string;
  discountAmount?: number | string;
}

export interface CreateSubscriptionDto {
  customerId: string;
  planId: string;
  quotationId?: string | null;
  startDate?: Date | string;
  currency?: string;
  paymentTerms?: string;
  lines: CreateSubscriptionLineDto[];
  discountRuleIds?: string[];
}

export interface ConvertQuotationToSubscriptionDto {
  quotationId: string;
  startDate?: Date | string;
  paymentTerms?: string;
}

export interface UpdateSubscriptionStatusDto {
  status: SubscriptionStatus;
  reason?: string;
}

export interface SubscriptionQueryFilters {
  customerId?: string;
  status?: SubscriptionStatus;
  search?: string;
  dueForBilling?: boolean;
  page?: number;
  limit?: number;
}

