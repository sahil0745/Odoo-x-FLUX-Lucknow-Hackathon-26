import { TaxType } from '@prisma/client';

export interface CreateTaxRuleDto {
  name: string;
  taxType?: TaxType;
  rate: number | string;
  isDefault?: boolean;
  isActive?: boolean;
  description?: string;
  productIds?: string[];
}

export interface UpdateTaxRuleDto {
  name?: string;
  taxType?: TaxType;
  rate?: number | string;
  isDefault?: boolean;
  isActive?: boolean;
  description?: string;
  productIds?: string[];
}

