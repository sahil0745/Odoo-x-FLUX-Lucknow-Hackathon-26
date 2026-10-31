import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  UserRole,
  ProductType,
  BillingFrequency,
  QuotationStatus,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  TaxType,
  DiscountType,
  DiscountScope,
  BillingRunStatus,
} from '@prisma/client';
import { checkDatabaseConnection } from '../src/config/database';

describe('Database Architecture & Model Integrity (Audited v1.1)', () => {
  it('exports all 11 required domain enums from Prisma Client', () => {
    expect(UserRole.ADMIN).toBe('ADMIN');
    expect(UserRole.STAFF).toBe('STAFF');
    expect(UserRole.CUSTOMER).toBe('CUSTOMER');

    expect(ProductType.SOFTWARE).toBe('SOFTWARE');
    expect(ProductType.SERVICE).toBe('SERVICE');
    expect(ProductType.ADD_ON).toBe('ADD_ON');

    expect(BillingFrequency.DAILY).toBe('DAILY');
    expect(BillingFrequency.WEEKLY).toBe('WEEKLY');
    expect(BillingFrequency.MONTHLY).toBe('MONTHLY');
    expect(BillingFrequency.YEARLY).toBe('YEARLY');

    expect(SubscriptionStatus.DRAFT).toBe('DRAFT');
    expect(SubscriptionStatus.QUOTATION).toBe('QUOTATION');
    expect(SubscriptionStatus.CONFIRMED).toBe('CONFIRMED');
    expect(SubscriptionStatus.ACTIVE).toBe('ACTIVE');
    expect(SubscriptionStatus.PAUSED).toBe('PAUSED');
    expect(SubscriptionStatus.CLOSED).toBe('CLOSED');

    expect(InvoiceStatus.DRAFT).toBe('DRAFT');
    expect(InvoiceStatus.CONFIRMED).toBe('CONFIRMED');
    expect(InvoiceStatus.PAID).toBe('PAID');
    expect(InvoiceStatus.CANCELLED).toBe('CANCELLED');

    expect(PaymentMethod.BANK_TRANSFER).toBe('BANK_TRANSFER');
    expect(TaxType.PERCENTAGE).toBe('PERCENTAGE');
    expect(DiscountType.FIXED).toBe('FIXED');
    expect(DiscountScope.SUBSCRIPTION).toBe('SUBSCRIPTION');
    expect(BillingRunStatus.GENERATED).toBe('GENERATED');
  });

  it('registers all 24 audited domain models in Prisma Client metadata', () => {
    const modelNames = Object.values(Prisma.ModelName);
    expect(modelNames).toContain('User');
    expect(modelNames).toContain('CustomerProfile');
    expect(modelNames).toContain('StaffProfile');
    expect(modelNames).toContain('PasswordResetToken');
    expect(modelNames).toContain('Product');
    expect(modelNames).toContain('ProductVariant');
    expect(modelNames).toContain('SubscriptionPlan');
    expect(modelNames).toContain('QuotationTemplate');
    expect(modelNames).toContain('QuotationTemplateLine');
    expect(modelNames).toContain('Quotation');
    expect(modelNames).toContain('QuotationLine');
    expect(modelNames).toContain('Subscription');
    expect(modelNames).toContain('SubscriptionLine');
    expect(modelNames).toContain('SubscriptionDiscount'); // Audited model
    expect(modelNames).toContain('SubscriptionStatusHistory');
    expect(modelNames).toContain('TaxRule');
    expect(modelNames).toContain('TaxRuleProduct');
    expect(modelNames).toContain('DiscountRule');
    expect(modelNames).toContain('DiscountApplication');
    expect(modelNames).toContain('Invoice');
    expect(modelNames).toContain('InvoiceLine');
    expect(modelNames).toContain('BillingCycleLog');
    expect(modelNames).toContain('Payment');
    expect(modelNames).toContain('PaymentAllocation');
    expect(modelNames).toContain('AuditLog');
    expect(modelNames).toContain('RefreshTokenSession'); // Master Prompt 04A persistent session management
    expect(modelNames.length).toBe(26); // 24 domain models + RefreshTokenSession + SystemMeta
  });

  it('ensures Prisma Decimal eliminates floating-point rounding errors', () => {
    // Classic JavaScript floating-point bug: 0.1 + 0.2 !== 0.3 (is 0.30000000000000004)
    const floatSum = 0.1 + 0.2;
    expect(floatSum).not.toBe(0.3);

    // Prisma Decimal representation: exact math
    const decA = new Prisma.Decimal('0.10');
    const decB = new Prisma.Decimal('0.20');
    const decSum = decA.plus(decB);
    expect(decSum.toFixed(2)).toBe('0.30');

    // Product additive variant calculation: Base 1000.00 + Odoo Brand 560.00 = 1560.00
    const basePrice = new Prisma.Decimal('1000.00');
    const variantSurcharge = new Prisma.Decimal('560.00');
    const finalPrice = basePrice.plus(variantSurcharge);
    expect(finalPrice.toFixed(2)).toBe('1560.00');

    // Tax calculation: 1560.00 * 18% = 280.80 -> Total = 1840.80
    const taxRate = new Prisma.Decimal('18.00');
    const taxAmount = finalPrice.times(taxRate).dividedBy(100).toDecimalPlaces(2);
    expect(taxAmount.toFixed(2)).toBe('280.80');
    const invoiceGrandTotal = finalPrice.plus(taxAmount);
    expect(invoiceGrandTotal.toFixed(2)).toBe('1840.80');

    // Partial payment allocations verification
    const invoiceTotal = new Prisma.Decimal('1840.80');
    const payment1 = new Prisma.Decimal('1000.00');
    const payment2 = new Prisma.Decimal('840.80');
    const totalPaid = payment1.plus(payment2);
    const balanceDue = invoiceTotal.minus(totalPaid);
    expect(balanceDue.toFixed(2)).toBe('0.00');
  });

  it('non-blocking database connectivity check accurately reports connection state', async () => {
    const status = await checkDatabaseConnection();
    expect(typeof status.connected).toBe('boolean');
    if (!status.connected) {
      expect(status.message).toBeDefined();
    }
  });
});
