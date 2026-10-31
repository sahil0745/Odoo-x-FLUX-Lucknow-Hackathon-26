import { Request, Response, NextFunction } from 'express';
import { SubscriptionStatus } from '@prisma/client';
import { subscriptionsService } from './subscriptions.service';
import {
  createSubscriptionSchema,
  updateSubscriptionStatusSchema,
} from './subscriptions.validation';

export class SubscriptionsController {
  /**
   * GET /api/v1/subscriptions
   */
  async listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.query.customerId as string | undefined;
      const status = req.query.status as SubscriptionStatus | undefined;
      const search = req.query.search as string | undefined;

      const subscriptions = await subscriptionsService.listSubscriptions(
        {
          id: req.user!.id,
          role: req.user!.role,
          customerProfileId: req.user!.customerProfileId,
        },
        { customerId, status, search }
      );

      res.status(200).json({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/subscriptions/:id
   */
  async getSubscriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.getSubscriptionById(
        req.params.id,
        {
          id: req.user!.id,
          role: req.user!.role,
          customerProfileId: req.user!.customerProfileId,
        }
      );

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/subscriptions
   */
  async createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createSubscriptionSchema.parse(req.body);
      const subscription = await subscriptionsService.createSubscription(
        validated,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        message: 'Subscription agreement created successfully',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/subscriptions/:id/status
   */
  async updateSubscriptionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSubscriptionStatusSchema.parse(req.body);
      const updated = await subscriptionsService.updateSubscriptionStatus(
        req.params.id,
        validated,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        message: `Subscription status updated to ${validated.status}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionsController = new SubscriptionsController();
