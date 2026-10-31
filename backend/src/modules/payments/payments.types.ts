import { PaymentMethod } from '@prisma/client';

export interface PaymentAllocationInput {
  invoiceId: string;
  amount: number;
}

export interface CreatePaymentDto {
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentDate?: string | Date;
  notes?: string;
  allocations?: PaymentAllocationInput[];
}

export interface PaymentFilters {
  customerId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
}

export interface PaymentSummaryStats {
  totalCollected: number;
  thisMonthCollected: number;
  totalPaymentsCount: number;
  methodBreakdown: Record<string, number>;
}
