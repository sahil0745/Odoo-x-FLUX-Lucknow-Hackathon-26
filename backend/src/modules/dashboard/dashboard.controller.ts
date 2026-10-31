import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { ApiResponse } from '../../types';

const dashboardService = new DashboardService();

export class DashboardController {
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await dashboardService.getMetrics(req.user!);

      const response: ApiResponse<typeof metrics> = {
        success: true,
        message: 'Executive dashboard metrics retrieved successfully',
        data: metrics,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
