import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { planController } from './plan.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requirePermission } from '../../middleware/authorize';

const router = Router();

// All plan operations require authentication
router.use(authenticate);

// Public plan listing for all authenticated users (Admin, Staff, Customer)
router.get(
  '/',
  requirePermission('plans.read'),
  (req, res, next) => planController.listPlans(req, res, next)
);

router.get(
  '/:id',
  requirePermission('plans.read'),
  (req, res, next) => planController.getPlanById(req, res, next)
);

// Plan modifications restricted strictly to ADMIN with 'plans.manage'
router.post(
  '/',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => planController.createPlan(req, res, next)
);

router.put(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => planController.updatePlan(req, res, next)
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => planController.deletePlan(req, res, next)
);

export default router;
