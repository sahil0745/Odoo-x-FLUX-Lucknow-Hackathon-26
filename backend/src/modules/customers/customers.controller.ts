import { Request, Response, NextFunction } from 'express';
import { customerService } from './customers.service';
import {
  createCustomerSchema,
  updateCustomerProfileSchema,
  customerQuerySchema,
} from './customers.validation';

export class CustomerController {
  async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createCustomerSchema.parse(req.body);
      const result = await customerService.createCustomer(validated);

      res.status(201).json({
        success: true,
        message: 'Customer provisioned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = customerQuerySchema.parse(req.query);
      const result = await customerService.listCustomers(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.getCustomerById(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCustomerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateCustomerProfileSchema.parse(req.body);
      const updated = await customerService.updateCustomerProfile(
        req.user!,
        req.params.id,
        validated
      );

      res.status(200).json({
        success: true,
        message: 'Customer profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await customerService.getCustomerSubscriptions(req.user!, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await customerService.getCustomerQuotations(req.user!, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await customerService.getCustomerInvoices(req.user!, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await customerService.getCustomerPayments(req.user!, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
