import { DiscountType, DiscountScope } from '@prisma/client';

export interface CreateDiscountDto {
  name: string;
  code?: string;
  discountType?: DiscountType;
  value: number | string;
  scope?: DiscountScope;
  productId?: string | null;
  minPurchaseAmount?: number | string | null;
  minQuantity?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  maxUsageLimit?: number | null;
  isActive?: boolean;
}

export interface UpdateDiscountDto {
  name?: string;
  code?: string;
  discountType?: DiscountType;
  value?: number | string;
  scope?: DiscountScope;
  productId?: string | null;
  minPurchaseAmount?: number | string | null;
  minQuantity?: number | null;
  startDate?: Date | string;
  endDate?: Date | string;
  maxUsageLimit?: number | null;
  isActive?: boolean;
}

export interface ValidateDiscountDto {
  code: string;
  subtotal?: number;
  productId?: string;
  quantity?: number;
}

