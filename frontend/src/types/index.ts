export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface CustomerProfile {
  id: string;
  contactName: string;
  companyName?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  city?: string | null;
  country?: string | null;
  taxNumber?: string | null;
}

export interface StaffProfile {
  id: string;
  department?: string | null;
  title?: string | null;
  createdBy?: {
    id: string;
    email: string;
  } | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
  customerProfile?: CustomerProfile | null;
  staffProfile?: StaffProfile | null;
  createdAt?: string;
}

export interface LoginResponseData {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
  phone?: string;
}

export interface HealthResponse {
  success: boolean;
  application: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  version: string;
  database: {
    connected: boolean;
    status: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  details?: unknown;
}

// ------------------------------------------------------------------------------
// Product & Variant Types
// ------------------------------------------------------------------------------

export type ProductType = 'SOFTWARE' | 'SERVICE' | 'ADD_ON';

export interface ProductVariant {
  id: string;
  productId: string;
  variantType: string;
  variantValue: string;
  additionalPrice: number;
  effectivePrice?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  marginPercent?: number;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  variants?: ProductVariant[];
}

export interface CreateProductPayload {
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  isActive?: boolean;
}

export interface CreateVariantPayload {
  variantType: string;
  variantValue: string;
  additionalPrice: number;
  isActive?: boolean;
}

// ------------------------------------------------------------------------------
// Subscription Plan Types
// ------------------------------------------------------------------------------

export type BillingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  billingFrequency: BillingFrequency;
  intervalCount: number;
  minimumQuantity: number;
  availableFrom: string;
  availableUntil?: string | null;
  allowAutoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    subscriptions: number;
    quotations: number;
  };
}

export interface CreatePlanPayload {
  name: string;
  description?: string;
  price: number;
  billingFrequency: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom?: string;
  availableUntil?: string | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
}
