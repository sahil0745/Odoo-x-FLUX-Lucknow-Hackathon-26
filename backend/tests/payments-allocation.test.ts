import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { recordPaymentSchema, paymentAllocationSchema } from '../src/modules/payments/payments.validation';

describe('Payment & Allocation Validation and Math', () => {
  it('validates a correct payment payload with allocations', () => {
    const payload = {
      customerId: 'a0000000-0000-0000-0000-000000000001',
      amount: 1500.0,
      paymentMethod: 'CREDIT_CARD',
      allocations: [
        {
          invoiceId: 'b0000000-0000-0000-0000-000000000001',
          amount: 1000.0,
        },
        {
          invoiceId: 'b0000000-0000-0000-0000-000000000002',
          amount: 500.0,
        },
      ],
    };

    const parsed = recordPaymentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects allocation with non-positive amount', () => {
    const parsed = paymentAllocationSchema.safeParse({
      invoiceId: 'b0000000-0000-0000-0000-000000000001',
      amount: -100,
    });
    expect(parsed.success).toBe(false);
  });

  it('calculates invoice balance due and partial payment using exact Decimal arithmetic', () => {
    const invoiceTotal = new Prisma.Decimal('1850.75');
    const paymentPart1 = new Prisma.Decimal('1000.00');

    const remainingBal1 = invoiceTotal.minus(paymentPart1);
    expect(remainingBal1.toFixed(2)).toBe('850.75');

    const paymentPart2 = new Prisma.Decimal('850.75');
    const finalBalance = remainingBal1.minus(paymentPart2);
    expect(finalBalance.toFixed(2)).toBe('0.00');
    expect(finalBalance.isZero()).toBe(true);
  });
});

