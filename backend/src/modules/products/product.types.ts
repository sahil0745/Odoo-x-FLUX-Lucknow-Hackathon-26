import { ProductType } from '@prisma/client';

export interface CreateProductDto {
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  type?: ProductType;
  salesPrice?: number;
  costPrice?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface CreateProductVariantDto {
  variantType: string;
  variantValue: string;
  additionalPrice: number;
  isActive?: boolean;
}

export interface UpdateProductVariantDto {
  variantType?: string;
  variantValue?: string;
  additionalPrice?: number;
  isActive?: boolean;
}
