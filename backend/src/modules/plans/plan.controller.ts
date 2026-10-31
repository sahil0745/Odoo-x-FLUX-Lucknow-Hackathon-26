import { Request, Response, NextFunction } from 'express';
import { BillingFrequency } from '@prisma/client';
import { planService } from './plan.service';
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
} from './plan.validation';

export class PlanController {
  /**
   * GET /api/v1/plans
   */
  async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const billingFrequency = req.query.billingFrequency as BillingFrequency | undefined;
      const isActive =
        req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined;
      const activeOnly =
        req.query.activeOnly !== undefined
          ? req.query.activeOnly === 'true'
          : undefined;

      const plans = await planService.listPlans({
        billingFrequency,
        isActive,
        activeOnly,
      });

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans/:id
   */
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

  /**
   * POST /api/v1/plans
   */
  async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createSubscriptionPlanSchema.parse(req.body);
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

  /**
   * PUT /api/v1/plans/:id
   */
  async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSubscriptionPlanSchema.parse(req.body);
      const plan = await planService.updatePlan(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/plans/:id
   */
  async deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await planService.deletePlan(req.params.id);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const planController = new PlanController();
