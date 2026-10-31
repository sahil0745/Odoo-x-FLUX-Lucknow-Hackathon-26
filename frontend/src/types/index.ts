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

// -----------------------------------------------------------------------------
// PRODUCT & VARIANT TYPES
// -----------------------------------------------------------------------------

export type ProductType = 'SOFTWARE' | 'SERVICE' | 'ADD_ON';

export interface ProductVariant {
  id: string;
  productId: string;
  variantType: string;
  variantValue: string;
  additionalPrice: string;
  effectivePrice?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: string;
  costPrice?: string;
  marginPercent?: number;
  notes?: string | null;
  isActive: boolean;
  variantCount?: number;
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVariantPayload {
  variantType: string;
  variantValue: string;
  additionalPrice: string | number;
  isActive?: boolean;
}

export interface CreateProductPayload {
  name: string;
  type: ProductType;
  salesPrice: string | number;
  costPrice: string | number;
  notes?: string | null;
  isActive?: boolean;
  variants?: CreateVariantPayload[];
}

export interface UpdateProductPayload {
  name?: string;
  type?: ProductType;
  salesPrice?: string | number;
  costPrice?: string | number;
  notes?: string | null;
  isActive?: boolean;
}

export interface CalculatePricePayload {
  productId: string;
  selectedVariantIds: string[];
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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// -----------------------------------------------------------------------------
// SUBSCRIPTION PLANS TYPES
// -----------------------------------------------------------------------------

export type BillingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type PlanAvailabilityStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'INACTIVE';

export interface AssociatedProductSummary {
  id: string;
  name: string;
  type: string;
  salesPrice: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: string;
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
  currency?: string;
  cadenceFormatted?: string;
  availabilityStatus: PlanAvailabilityStatus;
  isAvailable: boolean;
  activeSubscriptionCount?: number;
  associatedTemplatesCount?: number;
  associatedProducts?: AssociatedProductSummary[];
  _count?: {
    subscriptions: number;
    quotations: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanPayload {
  name: string;
  description?: string | null;
  price: string | number;
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
  associatedProductIds?: string[];
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string | null;
  price?: string | number;
  billingFrequency?: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom?: string;
  availableUntil?: string | null;
  allowAutoClose?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
  associatedProductIds?: string[];
}

export interface QuantityValidationResult {
  isValid: boolean;
  error?: string;
  requestedQuantity: number;
  minimumQuantity: number;
}

export interface BillingCycleResult {
  periodStart: string;
  periodEnd: string;
  nextBillingDate: string;
}
