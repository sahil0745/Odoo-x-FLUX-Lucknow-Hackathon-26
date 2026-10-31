import { Request, Response, NextFunction } from 'express';
import { taxService } from './taxes.service';
import { createTaxRuleSchema, updateTaxRuleSchema } from './taxes.validation';

export class TaxController {
  async createTaxRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createTaxRuleSchema.parse(req.body);
      const taxRule = await taxService.createTaxRule(validated);

      res.status(201).json({
        success: true,
        message: 'Tax rule created successfully',
        data: taxRule,
      });
    } catch (error) {
      next(error);
    }
  }

  async listTaxRules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlyActive = req.query.active === 'true';
      const taxRules = await taxService.listTaxRules(onlyActive);

      res.status(200).json({
        success: true,
        data: taxRules,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaxRuleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taxRule = await taxService.getTaxRuleById(req.params.id);

      res.status(200).json({
        success: true,
        data: taxRule,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTaxRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateTaxRuleSchema.parse(req.body);
      const updated = await taxService.updateTaxRule(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Tax rule updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTaxRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taxService.deleteTaxRule(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taxController = new TaxController();

