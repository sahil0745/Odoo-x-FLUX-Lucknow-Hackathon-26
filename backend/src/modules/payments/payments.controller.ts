import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { createPaymentSchema, paymentFiltersSchema } from './payments.validation';
import { ApiResponse } from '../../types';

const paymentsService = new PaymentsService();

export class PaymentsController {
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedDto = createPaymentSchema.parse(req.body);
      const payment = await paymentsService.recordPayment(validatedDto, req.user!.id);

      const response: ApiResponse<typeof payment> = {
        success: true,
        message: 'Payment recorded and allocations applied successfully',
        data: payment,
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = paymentFiltersSchema.parse(req.query);
      const payments = await paymentsService.listPayments(req.user!, filters);

      const response: ApiResponse<typeof payments> = {
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentsService.getPaymentById(req.params.id, req.user!);

      const response: ApiResponse<typeof payment> = {
        success: true,
        message: 'Payment details retrieved successfully',
        data: payment,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await paymentsService.getPaymentStats(req.user!);

      const response: ApiResponse<typeof stats> = {
        success: true,
        message: 'Payment summary statistics retrieved successfully',
        data: stats,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async getCustomerUnpaidInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoices = await paymentsService.getCustomerUnpaidInvoices(
        req.params.customerId,
        req.user!
      );

      const response: ApiResponse<typeof invoices> = {
        success: true,
        message: 'Outstanding customer invoices retrieved successfully',
        data: invoices,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
