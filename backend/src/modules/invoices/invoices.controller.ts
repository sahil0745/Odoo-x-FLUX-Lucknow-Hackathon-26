import { Request, Response, NextFunction } from 'express';
import { invoiceService } from './invoices.service';
import {
  createManualInvoiceSchema,
  generateRecurringInvoiceSchema,
  updateInvoiceStatusSchema,
  invoiceQuerySchema,
} from './invoices.validation';

export class InvoiceController {
  async generateRecurringInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = generateRecurringInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.generateSubscriptionInvoice(validated.subscriptionId);

      res.status(201).json({
        success: true,
        message: 'Recurring invoice generated successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async processDueBilling(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await invoiceService.processDueRecurringBilling();

      res.status(200).json({
        success: true,
        message: 'Recurring billing batch processing completed',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async createManualInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createManualInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.createManualInvoice(validated);

      res.status(201).json({
        success: true,
        message: 'Manual invoice created successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = invoiceQuerySchema.parse(req.query);
      const result = await invoiceService.listInvoices(req.user!, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoiceService.getInvoiceById(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateInvoiceStatusSchema.parse(req.body);
      const updated = await invoiceService.updateInvoiceStatus(
        req.params.id,
        validated.status,
        validated.notes
      );

      res.status(200).json({
        success: true,
        message: `Invoice status updated to ${validated.status}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await invoiceService.confirmInvoice(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Invoice confirmed successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await invoiceService.cancelInvoice(req.params.id, req.body?.reason);
      res.status(200).json({
        success: true,
        message: 'Invoice cancelled',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pdfData = await invoiceService.getInvoicePdfData(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        data: pdfData,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const invoiceController = new InvoiceController();
