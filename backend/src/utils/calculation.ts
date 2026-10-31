import { Prisma } from '@prisma/client';

export class FinancialCalculator {
  /**
   * Convert number or string to Prisma.Decimal with 2 decimal precision
   */
  static toDecimal(val: number | string | Prisma.Decimal): Prisma.Decimal {
    if (val instanceof Prisma.Decimal) return val;
    const num = Number(val);
    return new Prisma.Decimal(isNaN(num) ? '0.00' : num.toFixed(2));
  }

  /**
   * Safe financial sum
   */
  static sum(a: number | Prisma.Decimal, b: number | Prisma.Decimal): Prisma.Decimal {
    const decA = this.toDecimal(a);
    const decB = this.toDecimal(b);
    return decA.plus(decB);
  }

  /**
   * Safe financial subtraction
   */
  static subtract(a: number | Prisma.Decimal, b: number | Prisma.Decimal): Prisma.Decimal {
    const decA = this.toDecimal(a);
    const decB = this.toDecimal(b);
    return decA.minus(decB);
  }

  /**
   * Calculate line item financial figures
   */
  static calculateLine(params: {
    unitPrice: number | string;
    quantity: number;
    discountAmount?: number | string;
    taxRatePercent?: number | string;
  }) {
    const unitPrice = Number(params.unitPrice || 0);
    const qty = Math.max(1, params.quantity || 1);
    const discount = Number(params.discountAmount || 0);
    const taxRate = Number(params.taxRatePercent || 0);

    const baseAmount = unitPrice * qty;
    const taxableAmount = Math.max(0, baseAmount - discount);
    const taxAmount = (taxableAmount * taxRate) / 100;
    const lineTotal = taxableAmount + taxAmount;

    return {
      unitPrice: this.toDecimal(unitPrice),
      quantity: qty,
      discountAmount: this.toDecimal(discount),
      taxRate: this.toDecimal(taxRate),
      taxAmount: this.toDecimal(taxAmount),
      lineTotal: this.toDecimal(lineTotal),
    };
  }
}

