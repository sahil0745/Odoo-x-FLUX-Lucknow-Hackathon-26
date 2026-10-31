import { SubscriptionStatus } from '@prisma/client';

export interface CreateSubscriptionLineDto {
  productId: string;
  variantId?: string | null;
  taxRuleId?: string | null;
  quantity?: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface CreateSubscriptionDto {
  customerId: string;
  planId: string;
  quotationId?: string | null;
  startDate?: Date | string;
  paymentTerms?: string;
  currency?: string;
  status?: SubscriptionStatus;
  lines: CreateSubscriptionLineDto[];
}

export interface UpdateSubscriptionStatusDto {
  status: SubscriptionStatus;
  reason?: string;
}
