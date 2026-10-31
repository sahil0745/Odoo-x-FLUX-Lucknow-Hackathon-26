import { ValidationError } from '../../utils/AppError';

export interface QuantityValidationResult {
  isValid: boolean;
  error?: string;
  requestedQuantity: number;
  minimumQuantity: number;
}

export class PlanQuantityService {
  /**
   * Validate whether a requested subscription quantity meets the plan's minimum quantity requirements.
   *
   * Business Rules:
   * 1. Quantity must be a valid positive integer (>= 1).
   * 2. Fractional/decimal quantities are strictly prohibited.
   * 3. Quantity cannot be lower than the plan's configured minimum quantity.
   */
  validateQuantity(quantity: number, minimumQuantity: number): QuantityValidationResult {
    // 1. Must be a valid number
    if (typeof quantity !== 'number' || isNaN(quantity) || !isFinite(quantity)) {
      return {
        isValid: false,
        error: `Requested quantity must be a valid number, received: ${quantity}`,
        requestedQuantity: quantity,
        minimumQuantity,
      };
    }

    // 2. Must be an integer
    if (!Number.isInteger(quantity)) {
      return {
        isValid: false,
        error: `Requested quantity must be a whole integer. Fractional quantities (${quantity}) are not allowed.`,
        requestedQuantity: quantity,
        minimumQuantity,
      };
    }

    // 3. Must be strictly positive
    if (quantity < 1) {
      return {
        isValid: false,
        error: `Requested quantity must be at least 1, received: ${quantity}`,
        requestedQuantity: quantity,
        minimumQuantity,
      };
    }

    // 4. Must meet plan minimum quantity
    if (quantity < minimumQuantity) {
      return {
        isValid: false,
        error: `Requested quantity (${quantity}) is below the plan minimum required quantity (${minimumQuantity}).`,
        requestedQuantity: quantity,
        minimumQuantity,
      };
    }

    return {
      isValid: true,
      requestedQuantity: quantity,
      minimumQuantity,
    };
  }

  /**
   * Assert quantity is valid, throwing ValidationError with actionable message if invalid.
   */
  assertValidQuantity(quantity: number, minimumQuantity: number): void {
    const result = this.validateQuantity(quantity, minimumQuantity);
    if (!result.isValid) {
      throw new ValidationError(result.error || 'Invalid subscription quantity');
    }
  }
}

export const planQuantityService = new PlanQuantityService();
