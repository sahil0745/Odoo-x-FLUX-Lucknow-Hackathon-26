import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { staffController } from './staff.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requirePermission } from '../../middleware/authorize';

const router = Router();

// Enforce authentication & ADMIN role with specific permissions across all staff endpoints
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.post(
  '/',
  requirePermission('staff.create'),
  (req, res, next) => staffController.createStaff(req, res, next)
);

router.get(
  '/',
  requirePermission('staff.read'),
  (req, res, next) => staffController.listStaff(req, res, next)
);

router.get(
  '/:id',
  requirePermission('staff.read'),
  (req, res, next) => staffController.getStaffById(req, res, next)
);

router.patch(
  '/:id',
  requirePermission('staff.update'),
  (req, res, next) => staffController.updateStaff(req, res, next)
);

router.patch(
  '/:id/status',
  requirePermission('staff.deactivate'),
  (req, res, next) => staffController.updateStaffStatus(req, res, next)
);

export default router;
