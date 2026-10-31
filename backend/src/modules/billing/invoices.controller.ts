import { Request, Response, NextFunction } from 'express';
import { InvoiceStatus } from '@prisma/client';
import { invoicesService } from './invoices.service';
import { billingEngineService } from './billing-engine.service';
import {
  triggerBillingRunSchema,
  updateInvoiceStatusSchema,
} from './billing.validation';

export class InvoicesController {
  /**
   * GET /api/v1/invoices
   */
  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.query.customerId as string | undefined;
      const subscriptionId = req.query.subscriptionId as string | undefined;
      const status = req.query.status as InvoiceStatus | undefined;
      const search = req.query.search as string | undefined;
      const isOverdue = req.query.isOverdue === 'true';

      const invoices = await invoicesService.listInvoices(
        {
          id: req.user!.id,
          role: req.user!.role,
          customerProfileId: req.user!.customerProfileId,
        },
        { customerId, subscriptionId, status, search, isOverdue }
      );

      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invoices/stats
   */
  async getBillingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await invoicesService.getBillingStats({
        id: req.user!.id,
        role: req.user!.role,
        customerProfileId: req.user!.customerProfileId,
      });

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invoices/:id
   */
  async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoicesService.getInvoiceById(
        req.params.id,
        {
          id: req.user!.id,
          role: req.user!.role,
          customerProfileId: req.user!.customerProfileId,
        }
      );

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/invoices/:id/status
   */
  async updateInvoiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateInvoiceStatusSchema.parse(req.body);
      const invoice = await invoicesService.updateInvoiceStatus(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: `Invoice status changed to ${validated.status}`,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/billing/run
   */
  async triggerBillingRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = triggerBillingRunSchema.parse(req.body);
      const summary = await billingEngineService.processBillingRun(validated);

      res.status(200).json({
        success: true,
        message: `Billing run completed: ${summary.generated} invoices generated, ${summary.skipped} skipped, ${summary.failed} failed`,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/billing/logs
   */
  async listBillingLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriptionId = req.query.subscriptionId as string | undefined;
      const logs = await invoicesService.listBillingLogs({ subscriptionId });

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const invoicesController = new InvoicesController();
