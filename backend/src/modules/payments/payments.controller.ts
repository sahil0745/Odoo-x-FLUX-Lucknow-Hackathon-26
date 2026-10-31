import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payments.service';
import { recordPaymentSchema, paymentQuerySchema, paymentAllocationSchema } from './payments.validation';
import { z } from 'zod';

export class PaymentController {
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = recordPaymentSchema.parse(req.body);
      const payment = await paymentService.recordPayment(req.user!, validated);

      res.status(201).json({
        success: true,
        message: 'Payment recorded and allocated successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async allocatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = z.array(paymentAllocationSchema).min(1).parse(req.body.allocations || req.body);
      const payment = await paymentService.allocatePayment(req.user!, req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Payment allocated successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = paymentQuerySchema.parse(req.query);
      const result = await paymentService.listPayments(req.user!, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentService.getPaymentById(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
