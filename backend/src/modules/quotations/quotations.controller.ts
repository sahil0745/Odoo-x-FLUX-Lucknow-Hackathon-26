import { Request, Response, NextFunction } from 'express';
import { quotationService } from './quotations.service';
import {
  createQuotationSchema,
  quotationStatusSchema,
  createQuotationTemplateSchema,
  quotationQuerySchema,
} from './quotations.validation';

export class QuotationController {
  async createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createQuotationSchema.parse(req.body);
      const quotation = await quotationService.createQuotation(req.user!, validated);

      res.status(201).json({
        success: true,
        message: 'Quotation created successfully',
        data: quotation,
      });
    } catch (error) {
      next(error);
    }
  }

  async listQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = quotationQuerySchema.parse(req.query);
      const result = await quotationService.listQuotations(req.user!, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await quotationService.getQuotationById(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: quotation,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateQuotationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = quotationStatusSchema.parse(req.body);
      const updated = await quotationService.updateQuotationStatus(
        req.user!,
        req.params.id,
        validated.status
      );

      res.status(200).json({
        success: true,
        message: `Quotation status updated to ${validated.status}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async acceptQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await quotationService.acceptQuotation(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Quotation accepted successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await quotationService.rejectQuotation(
        req.user!,
        req.params.id,
        req.body?.reason
      );
      res.status(200).json({
        success: true,
        message: 'Quotation rejected',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async convertQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await quotationService.convertQuotation(
        req.user!,
        req.params.id,
        req.body?.paymentTerms
      );
      res.status(201).json({
        success: true,
        message: 'Quotation converted into active subscription successfully',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createQuotationTemplateSchema.parse(req.body);
      const template = await quotationService.createTemplate(validated);

      res.status(201).json({
        success: true,
        message: 'Quotation template created successfully',
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  async listTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await quotationService.listTemplates();

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const quotationController = new QuotationController();
