import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';

export class DashboardController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getDashboardMetrics(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getOverview(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getRevenue(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getSubscriptions(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getInvoices(req.user!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
