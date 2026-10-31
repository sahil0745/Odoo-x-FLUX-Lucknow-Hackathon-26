import { ProductType, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface CreateVariantInput {
  variantType: string;
  variantValue: string;
  additionalPrice: number | string;
}

export interface CreateProductDto {
  name: string;
  type: ProductType;
  salesPrice: number | string;
  costPrice: number | string;
  notes?: string;
  isActive?: boolean;
  variants?: CreateVariantInput[];
}

export interface UpdateProductDto {
  name?: string;
  type?: ProductType;
  salesPrice?: number | string;
  costPrice?: number | string;
  notes?: string | null;
  isActive?: boolean;
}

export interface ListProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: ProductType;
  isActive?: boolean;
  sortBy?: 'name' | 'salesPrice' | 'createdAt' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateVariantDto {
  variantType: string;
  variantValue: string;
  additionalPrice: number | string;
}

export interface UpdateVariantDto {
  variantType?: string;
  variantValue?: string;
  additionalPrice?: number | string;
  isActive?: boolean;
}

export interface CalculatePriceDto {
  productId: string;
  selectedVariantIds: string[];
}

export interface VariantResponse {
  id: string;
  productId: string;
  variantType: string;
  variantValue: string;
  additionalPrice: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductResponse {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: string;
  costPrice?: string; // Excluded for CUSTOMER and STAFF
  notes?: string | null; // Excluded for CUSTOMER
  isActive: boolean;
  variantCount?: number;
  variants?: VariantResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceBreakdownItem {
  variantId: string;
  variantType: string;
  variantValue: string;
  additionalPrice: string;
}

export interface PriceCalculationResult {
  productId: string;
  productName: string;
  baseSalesPrice: string;
  selectedVariants: PriceBreakdownItem[];
  totalVariantAdditions: string;
  finalPrice: string;
  currency: string;
}
