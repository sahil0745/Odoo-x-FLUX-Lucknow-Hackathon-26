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

export type ProductType = 'SOFTWARE' | 'SERVICE' | 'ADD_ON';

export interface ProductVariant {
  id: string;
  productId: string;
  variantType: string;
  variantValue: string;
  additionalPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: string;
  costPrice?: string; // Visible only to ADMIN
  notes?: string | null; // Visible to ADMIN and STAFF
  isActive: boolean;
  variantCount?: number;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariantPayload {
  variantType: string;
  variantValue: string;
  additionalPrice: string | number;
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

