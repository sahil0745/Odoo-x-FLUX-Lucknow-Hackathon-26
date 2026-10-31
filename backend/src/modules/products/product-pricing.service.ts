import { Prisma } from '@prisma/client';
import { ValidationError } from '../../utils/AppError';

export interface VariantCalculationInput {
  id: string;
  productId?: string;
  variantType: string;
  variantValue: string;
  additionalPrice: Prisma.Decimal | number | string;
  isActive?: boolean;
}

export interface PriceCalculationBreakdown {
  basePrice: string;
  totalVariantAdditions: string;
  finalPrice: string;
  selectedVariants: Array<{
    variantId: string;
    variantType: string;
    variantValue: string;
    additionalPrice: string;
  }>;
}

export class ProductPricingService {
  /**
   * Reusable pure calculation engine for additive product pricing.
   * Enforces exact Prisma.Decimal financial precision, eliminating floating-point rounding bugs.
   *
   * Example:
   *   Base: 1000.00
   *   Variant (Brand = Odoo): +560.00
   *   Final Price: 1560.00
   */
  calculateProductPrice(
    basePriceInput: Prisma.Decimal | number | string,
    selectedVariants: VariantCalculationInput[],
    expectedProductId?: string
  ): PriceBreakdownBreakdown {
    // 1. Convert base price to Decimal
    let basePrice: Prisma.Decimal;
    try {
      basePrice = new Prisma.Decimal(basePriceInput);
      if (basePrice.isNaN() || !basePrice.isFinite() || basePrice.lt(0)) {
        throw new Error();
      }
    } catch {
      throw new ValidationError('Invalid base sales price: must be a non-negative number');
    }

    // 2. Validate variant list
    const seenIds = new Set<string>();
    const seenTypes = new Map<string, string>(); // variantType -> variantValue to detect conflicting single-choice categories

    let totalAdditions = new Prisma.Decimal('0.00');
    const breakdownItems: PriceBreakdownBreakdown['selectedVariants'] = [];

    for (const variant of selectedVariants) {
      // 2a. Reject duplicates
      if (seenIds.has(variant.id)) {
        throw new ValidationError(`Duplicate variant selected: ID '${variant.id}' cannot be selected more than once`);
      }
      seenIds.add(variant.id);

      // 2b. Reject inactive variants
      if (variant.isActive === false) {
        throw new ValidationError(
          `Cannot calculate price with inactive variant: '${variant.variantType}: ${variant.variantValue}' is deactivated`
        );
      }

      // 2c. Verify ownership against product
      if (expectedProductId && variant.productId && variant.productId !== expectedProductId) {
        throw new ValidationError(
          `Variant '${variant.variantType}: ${variant.variantValue}' (ID: ${variant.id}) does not belong to product '${expectedProductId}'`
        );
      }

      // 2d. Prevent mutually exclusive variant collisions (e.g. choosing two different "Editions" for the same product)
      const normalizedType = variant.variantType.trim().toLowerCase();
      if (seenTypes.has(normalizedType)) {
        const previousValue = seenTypes.get(normalizedType);
        throw new ValidationError(
          `Conflicting variant selection: Cannot select both '${previousValue}' and '${variant.variantValue}' for '${variant.variantType}'`
        );
      }
      seenTypes.set(normalizedType, variant.variantValue);

      // 2e. Decimal addition
      let addition: Prisma.Decimal;
      try {
        addition = new Prisma.Decimal(variant.additionalPrice);
        if (addition.isNaN() || !addition.isFinite() || addition.lt(0)) {
          throw new Error();
        }
      } catch {
        throw new ValidationError(
          `Invalid variant additional price for '${variant.variantType}: ${variant.variantValue}'`
        );
      }

      totalAdditions = totalAdditions.plus(addition);

      breakdownItems.push({
        variantId: variant.id,
        variantType: variant.variantType,
        variantValue: variant.variantValue,
        additionalPrice: addition.toFixed(2),
      });
    }

    const finalPrice = basePrice.plus(totalAdditions);

    return {
      basePrice: basePrice.toFixed(2),
      totalVariantAdditions: totalAdditions.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      selectedVariants: breakdownItems,
    };
  }
}

export type PriceBreakdownBreakdown = PriceCalculationBreakdown;
export const productPricingService = new ProductPricingService();
