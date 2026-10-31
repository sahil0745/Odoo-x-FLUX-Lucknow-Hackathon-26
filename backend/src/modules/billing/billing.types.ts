import { InvoiceStatus, BillingRunStatus } from '@prisma/client';

export interface BillingRunOptions {
  asOfDate?: Date | string;
  subscriptionId?: string;
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

export interface UpdateInvoiceStatusDto {
  status: InvoiceStatus;
  notes?: string;
}

export interface InvoiceFilters {
  customerId?: string;
  status?: InvoiceStatus;
  subscriptionId?: string;
  search?: string;
  isOverdue?: boolean;
}
