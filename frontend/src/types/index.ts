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

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ----------------------------------------------------------------------
// Domain Entity Types
// ----------------------------------------------------------------------

export type ProductType = 'SOFTWARE' | 'SERVICE' | 'ADD_ON';

export interface ProductVariant {
  id: string;
  productId: string;
  name?: string;
  variantType?: string;
  variantValue?: string;
  description?: string | null;
  variantPrice?: string | number;
  additionalPrice?: string | number;
  sku?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  type: ProductType;
  salesPrice: string | number;
  costPrice?: string | number | null;
  currency?: string;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt?: string;
}

export type BillingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  billingFrequency: BillingFrequency;
  intervalCount: number;
  trialDays: number;
  isRenewable: boolean;
  autoCloseAfterDays?: number | null;
  isActive: boolean;
  createdAt?: string;
  subscriptionsCount?: number;
}

export type TaxType = 'PERCENTAGE' | 'FIXED';

export interface Tax {
  id: string;
  name: string;
  rate: string | number;
  type: TaxType;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type DiscountScope = 'SUBSCRIPTION' | 'PRODUCT';

export interface Discount {
  id: string;
  code: string;
  description?: string | null;
  value: string | number;
  type: DiscountType;
  scope: DiscountScope;
  minPurchaseAmount?: string | number | null;
  maxUsageCount?: number | null;
  currentUsageCount: number;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  status: QuotationStatus;
  validUntil?: string | null;
  subtotal: string | number;
  taxTotal?: string | number;
  taxAmount?: string | number;
  discountTotal?: string | number;
  discountAmount?: string | number;
  grandTotal?: string | number;
  totalAmount?: string | number;
  notes?: string | null;
  customer?: {
    id: string;
    contactName: string;
    companyName?: string | null;
    user?: { email: string };
  };
  items?: QuotationItem[];
  lines?: QuotationItem[];
  createdAt?: string;
}

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED';

export interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  nextBillingDate: string;
  renewalCount: number;
  totalAmount: string | number;
  notes?: string | null;
  customer?: {
    id: string;
    contactName: string;
    companyName?: string | null;
    user?: { email: string };
  };
  plan?: Plan;
  items?: SubscriptionItem[];
  lines?: SubscriptionItem[];
  createdAt?: string;
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subscriptionId?: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  subtotal: string | number;
  taxTotal?: string | number;
  taxAmount?: string | number;
  discountTotal?: string | number;
  discountAmount?: string | number;
  grandTotal?: string | number;
  totalAmount?: string | number;
  amountPaid?: string | number;
  paidAmount?: string | number;
  balanceDue: string | number;
  customer?: {
    id: string;
    contactName: string;
    companyName?: string | null;
    billingAddress?: string | null;
    user?: { email: string };
  };
  subscription?: {
    id: string;
    subscriptionNumber: string;
  } | null;
  items?: InvoiceItem[];
  lines?: InvoiceItem[];
  createdAt?: string;
}

export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'CHECK'
  | 'CASH'
  | 'OTHER';

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount?: string | number;
  allocatedAmount?: string | number;
  invoice?: {
    id: string;
    invoiceNumber: string;
  };
}

export interface Payment {
  id: string;
  paymentReference: string;
  customerId: string;
  amount: string | number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionRef?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    contactName: string;
    companyName?: string | null;
    user?: { email: string };
  };
  allocations?: PaymentAllocation[];
  createdAt?: string;
}

export interface CustomerDetail extends CustomerProfile {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
  };
  subscriptions?: Subscription[];
  quotations?: Quotation[];
  invoices?: Invoice[];
  payments?: Payment[];
}

export interface DashboardMetrics {
  totalCustomers: number;
  totalProducts: number;
  activeSubscriptionsCount: number;
  pausedSubscriptionsCount: number;
  closedSubscriptionsCount: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  totalRevenueCollected: number;
  totalInvoicesCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  pendingAmount: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  recentActivity: {
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      status: InvoiceStatus;
      grandTotal: string | number;
      balanceDue: string | number;
      issueDate: string;
      dueDate: string;
      customer?: { companyName?: string | null; contactName: string };
    }>;
    payments: Array<{
      id: string;
      paymentReference: string;
      amount: string | number;
      paymentMethod: PaymentMethod;
      paymentDate: string;
      customer?: { companyName?: string | null; contactName: string };
    }>;
    subscriptions: Array<{
      id: string;
      subscriptionNumber: string;
      status: SubscriptionStatus;
      totalAmount: string | number;
      nextBillingDate: string;
      plan?: { name: string };
      customer?: { companyName?: string | null; contactName: string };
    }>;
  };
}
