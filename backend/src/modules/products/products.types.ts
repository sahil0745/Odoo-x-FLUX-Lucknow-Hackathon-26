import { ProductType } from '@prisma/client';

export interface CreateProductDto {
  name: string;
  type?: ProductType;
  salesPrice: number | string;
  costPrice?: number | string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  type?: ProductType;
  salesPrice?: number | string;
  costPrice?: number | string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateProductVariantDto {
  variantType: string;
  variantValue: string;
  additionalPrice: number | string;
  isActive?: boolean;
}

export interface UpdateProductVariantDto {
  variantType?: string;
  variantValue?: string;
  additionalPrice?: number | string;
  isActive?: boolean;
}

export interface ProductQueryFilters {
  search?: string;
  type?: ProductType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

