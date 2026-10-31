import { QuotationStatus } from '@prisma/client';

export interface CreateQuotationLineDto {
  productId: string;
  variantId?: string | null;
  taxRuleId?: string | null;
  quantity: number;
  unitPrice?: number | string;
  discountAmount?: number | string;
}

export interface CreateQuotationDto {
  customerId: string;
  planId: string;
  templateId?: string | null;
  validityDays?: number;
  currency?: string;
  notes?: string;
  lines: CreateQuotationLineDto[];
}

export interface UpdateQuotationDto {
  planId?: string;
  validityDays?: number;
  notes?: string;
  lines?: CreateQuotationLineDto[];
}

export interface CreateQuotationTemplateLineDto {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  unitPrice: number | string;
}

export interface CreateQuotationTemplateDto {
  name: string;
  planId: string;
  validityDays?: number;
  description?: string;
  isActive?: boolean;
  lines: CreateQuotationTemplateLineDto[];
}

export interface QuotationQueryFilters {
  customerId?: string;
  status?: QuotationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

