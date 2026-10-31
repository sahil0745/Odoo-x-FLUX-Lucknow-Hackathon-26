import { InvoiceStatus } from '@prisma/client';

export interface CreateInvoiceLineDto {
  productId: string;
  variantId?: string | null;
  taxRuleId?: string | null;
  description?: string;
  quantity: number;
  unitPrice: number | string;
  discountAmount?: number | string;
}

export interface CreateManualInvoiceDto {
  subscriptionId: string;
  billingPeriodStart: Date | string;
  billingPeriodEnd: Date | string;
  dueDate?: Date | string;
  notes?: string;
  lines?: CreateInvoiceLineDto[];
}

export interface GenerateRecurringInvoiceDto {
  subscriptionId: string;
}

export interface InvoiceQueryFilters {
  customerId?: string;
  subscriptionId?: string;
  status?: InvoiceStatus;
  overdueOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

