import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscriptions.service';
import {
  createSubscriptionSchema,
  convertQuotationSchema,
  updateSubscriptionStatusSchema,
  subscriptionQuerySchema,
} from './subscriptions.validation';

export class SubscriptionController {
  async createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createSubscriptionSchema.parse(req.body);
      const subscription = await subscriptionService.createSubscription(req.user!, validated);

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async convertQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = convertQuotationSchema.parse(req.body);
      const subscription = await subscriptionService.convertQuotationToSubscription(
        req.user!,
        validated
      );

      res.status(201).json({
        success: true,
        message: 'Quotation successfully converted to active subscription',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = subscriptionQuerySchema.parse(req.query);
      const result = await subscriptionService.listSubscriptions(req.user!, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionService.getSubscriptionById(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSubscriptionStatusSchema.parse(req.body);
      const updated = await subscriptionService.updateSubscriptionStatus(
        req.user!,
        req.params.id,
        validated
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

  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await subscriptionService.activateSubscription(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Subscription activated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await subscriptionService.pauseSubscription(
        req.user!,
        req.params.id,
        req.body?.reason
      );
      res.status(200).json({
        success: true,
        message: 'Subscription paused successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await subscriptionService.resumeSubscription(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Subscription resumed successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await subscriptionService.closeSubscription(
        req.user!,
        req.params.id,
        req.body?.reason
      );
      res.status(200).json({
        success: true,
        message: 'Subscription closed successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async renewSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const renewed = await subscriptionService.renewSubscription(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Subscription renewed successfully',
        data: renewed,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
