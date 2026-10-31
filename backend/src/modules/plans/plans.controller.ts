import { Request, Response, NextFunction } from 'express';
import { planService } from './plans.service';
import { createPlanSchema, updatePlanSchema, planQuerySchema } from './plans.validation';

export class PlanController {
  async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createPlanSchema.parse(req.body);
      const plan = await planService.createPlan(validated);

      res.status(201).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = planQuerySchema.parse(req.query);
      const result = await planService.listPlans(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await planService.getPlanById(req.params.id);

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updatePlanSchema.parse(req.body);
      const updated = await planService.updatePlan(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await planService.deletePlan(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const planController = new PlanController();

