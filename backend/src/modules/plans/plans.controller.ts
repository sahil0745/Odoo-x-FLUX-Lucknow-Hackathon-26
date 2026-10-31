import { Request, Response, NextFunction } from 'express';
import { plansService } from './plans.service';
import { billingFrequencyService } from './billing-frequency.service';
import {
  createPlanSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
  listPlansQuerySchema,
  validateQuantitySchema,
  calculateNextBillingDateSchema,
} from './plans.validation';

export class PlansController {
  /**
   * Create a new subscription plan (Admin only).
   */
  async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createPlanSchema.parse(req.body);
      const plan = await plansService.createPlan(validated);

      res.status(201).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List plans with filtering, search, and pagination.
   */
  async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listPlansQuerySchema.parse(req.query);
      const result = await plansService.listPlans(query, req.user?.role);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single plan by ID.
   */
  async getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await plansService.getPlanById(req.params.id, req.user?.role);

      res.status(200).json({
        success: true,
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update plan details (Admin only).
   */
  async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updatePlanSchema.parse(req.body);
      const plan = await plansService.updatePlan(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate or deactivate a plan (Admin only).
   */
  async updatePlanStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { isActive } = updatePlanStatusSchema.parse(req.body);
      const plan = await plansService.updatePlanStatus(req.params.id, isActive);

      res.status(200).json({
        success: true,
        message: `Subscription plan ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete plan if unreferenced (Admin only).
   */
  async deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await plansService.deletePlan(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate subscription quantity against plan minimum quantity.
   */
  async validateQuantity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { quantity } = validateQuantitySchema.parse(req.body);
      const validation = await plansService.validatePlanQuantity(req.params.id, quantity);

      res.status(200).json({
        success: true,
        data: { validation },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate next billing date utility endpoint.
   */
  async calculateNextBillingDate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, billingFrequency, intervalCount, anchorDay } =
        calculateNextBillingDateSchema.parse(req.body);

      const cycle = billingFrequencyService.calculateBillingCycle(
        startDate,
        billingFrequency,
        intervalCount,
        anchorDay
      );

      res.status(200).json({
        success: true,
        data: {
          periodStart: cycle.periodStart.toISOString(),
          periodEnd: cycle.periodEnd.toISOString(),
          nextBillingDate: cycle.nextBillingDate.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const plansController = new PlansController();
