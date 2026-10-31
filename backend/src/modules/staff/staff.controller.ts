import { Request, Response, NextFunction } from 'express';
import { staffService } from './staff.service';
import {
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from './staff.validation';

export class StaffController {
  /**
   * POST /api/v1/staff
   */
  async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.id;
      const validated = createStaffSchema.parse(req.body);
      const staff = await staffService.createStaff(adminUserId, validated);

      res.status(201).json({
        success: true,
        message: 'Internal Staff account created successfully',
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/staff
   */
  async listStaff(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffList = await staffService.listStaff();

      res.status(200).json({
        success: true,
        data: staffList,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/staff/:id
   */
  async getStaffById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await staffService.getStaffById(req.params.id);

      res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/staff/:id
   */
  async updateStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateStaffSchema.parse(req.body);
      const updated = await staffService.updateStaff(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Staff account updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/staff/:id/status
   */
  async updateStaffStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.id;
      const validated = updateStaffStatusSchema.parse(req.body);
      const updated = await staffService.updateStaffStatus(
        adminUserId,
        req.params.id,
        validated.isActive
      );

      res.status(200).json({
        success: true,
        message: `Staff account has been ${validated.isActive ? 'activated' : 'deactivated'}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const staffController = new StaffController();
