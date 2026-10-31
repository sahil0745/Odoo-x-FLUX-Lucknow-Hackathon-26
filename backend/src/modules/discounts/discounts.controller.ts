import { Request, Response, NextFunction } from 'express';
import { discountService } from './discounts.service';
import {
  createDiscountSchema,
  updateDiscountSchema,
  validateDiscountSchema,
} from './discounts.validation';

export class DiscountController {
  async createDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const validated = createDiscountSchema.parse(req.body);
      const discount = await discountService.createDiscount(adminId, validated);

      res.status(201).json({
        success: true,
        message: 'Discount rule created successfully',
        data: discount,
      });
    } catch (error) {
      next(error);
    }
  }

  async listDiscounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discounts = await discountService.listDiscounts();

      res.status(200).json({
        success: true,
        data: discounts,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDiscountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discount = await discountService.getDiscountById(req.params.id);

      res.status(200).json({
        success: true,
        data: discount,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateDiscountSchema.parse(req.body);
      const updated = await discountService.updateDiscount(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Discount rule updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await discountService.deleteDiscount(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = validateDiscountSchema.parse(req.body);
      const result = await discountService.validateDiscountCode(validated);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const discountController = new DiscountController();

