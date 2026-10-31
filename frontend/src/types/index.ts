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

// -----------------------------------------------------------------------------
// SUBSCRIPTION PLANS TYPES (M03)
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
  description: string | null;
  price: string;
  billingFrequency: BillingFrequency;
  intervalCount: number;
  minimumQuantity: number;
  availableFrom: string;
  availableUntil: string | null;
  allowAutoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  isActive: boolean;
  currency: string;
  cadenceFormatted: string;
  availabilityStatus: PlanAvailabilityStatus;
  isAvailable: boolean;
  activeSubscriptionCount?: number;
  associatedTemplatesCount?: number;
  associatedProducts?: AssociatedProductSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanPayload {
  name: string;
  description?: string | null;
  price: string | number;
  billingFrequency: BillingFrequency;
  intervalCount?: number;
  minimumQuantity?: number;
  availableFrom: string;
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



// -----------------------------------------------------------------------------
// SUBSCRIPTION TYPES (M05)
// -----------------------------------------------------------------------------

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED';

export interface SubscriptionLine {
  id: string;
  subscriptionId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  product?: {
    name: string;
    type: string;
  };
  variant?: {
    variantType: string;
    variantValue: string;
  } | null;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate?: string | null;
  nextBillingDate: string;
  lastBilledDate?: string | null;
  currency: string;
  paymentTerms: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  renewalCount: number;
  closedAt?: string | null;
  closureReason?: string | null;
  pausedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    contactName: string;
    companyName?: string | null;
    billingAddress?: string | null;
    city?: string | null;
    country?: string | null;
    taxNumber?: string | null;
  };
  plan?: SubscriptionPlan;
  lines?: SubscriptionLine[];
  _count?: {
    invoices: number;
    billingCycleLogs: number;
  };
}

// -----------------------------------------------------------------------------
// INVOICE & RECURRING BILLING TYPES (M06)
// -----------------------------------------------------------------------------

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
export type BillingRunStatus = 'PENDING' | 'GENERATED' | 'SKIPPED' | 'FAILED';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  product?: {
    name: string;
  };
  variant?: {
    variantType: string;
    variantValue: string;
  } | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  customerId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string | null;
  confirmedAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  customer?: {
    id: string;
    contactName: string;
    companyName?: string | null;
    billingAddress?: string | null;
    city?: string | null;
    country?: string | null;
    taxNumber?: string | null;
  };
  subscription?: {
    id: string;
    subscriptionNumber: string;
    paymentTerms: string;
    plan?: {
      name: string;
      billingFrequency: BillingFrequency;
    };
  };
  lines?: InvoiceLine[];
}

export interface BillingCycleLog {
  id: string;
  subscriptionId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceId?: string | null;
  status: BillingRunStatus;
  retryCount: number;
  lastAttemptAt?: string | null;
  errorMessage?: string | null;
  processedAt: string;
  subscription?: {
    subscriptionNumber: string;
    customer?: { contactName: string; companyName?: string | null };
    plan?: { name: string };
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    status: InvoiceStatus;
  } | null;
}

export interface BillingStats {
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  totalBalanceDue: number;
  overdueCount: number;
  statusBreakdown: {
    draft: number;
    confirmed: number;
    paid: number;
  };
}

export interface BillingRunSummary {
  processed: number;
  generated: number;
  skipped: number;
  failed: number;
  asOfDate: string;
  invoicesGenerated: string[];
  errors: Array<{
    subscriptionId: string;
    subscriptionNumber?: string;
    error: string;
  }>;
}

// -----------------------------------------------------------------------------
// PAYMENT MANAGEMENT TYPES (M08)
// -----------------------------------------------------------------------------

export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'CHECK'
  | 'CASH'
  | 'OTHER';

export interface PaymentAllocation {
  id: string;
  invoiceId: string;
  allocatedAmount: number;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    balanceDue: number;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
  };
}

export interface Payment {
  id: string;
  paymentReference: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string | null;
  totalAllocated: number;
  unallocatedAmount: number;
  customer?: {
    id: string;
    companyName?: string | null;
    contactName: string;
    contactEmail: string;
  };
  recordedBy?: {
    id: string;
    name: string;
    email: string;
  };
  allocations?: PaymentAllocation[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  totalCollected: number;
  thisMonthCollected: number;
  totalPaymentsCount: number;
  methodBreakdown: Record<string, number>;
}

export interface RecordPaymentPayload {
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  notes?: string;
  allocations?: Array<{
    invoiceId: string;
    amount: number;
  }>;
}

export interface UnpaidCustomerInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
}

// -----------------------------------------------------------------------------
// EXECUTIVE DASHBOARD TYPES (M12)
// -----------------------------------------------------------------------------

export interface DashboardMetrics {
  subscriptions: {
    total: number;
    active: number;
    paused: number;
    draft: number;
    closed: number;
    mrr: number;
  };
  revenue: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRatePercent: number;
  };
  overdue: {
    count: number;
    totalAmount: number;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    balanceDue: number;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
  }>;
  recentPayments: Array<{
    id: string;
    paymentReference: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
  }>;
}
