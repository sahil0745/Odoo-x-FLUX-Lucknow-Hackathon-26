import { PaymentMethod } from '@prisma/client';

export interface PaymentAllocationItemDto {
  invoiceId: string;
  amount: number | string;
}

export interface RecordPaymentDto {
  customerId: string;
  amount: number | string;
  currency?: string;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date | string;
  notes?: string;
  allocations?: PaymentAllocationItemDto[];
}

export interface PaymentQueryFilters {
  customerId?: string;
  paymentMethod?: PaymentMethod;
  page?: number;
  limit?: number;
}

