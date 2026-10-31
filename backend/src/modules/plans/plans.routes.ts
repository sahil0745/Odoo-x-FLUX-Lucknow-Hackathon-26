import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { plansController } from './plans.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requirePermission } from '../../middleware/authorize';

const router = Router();

// All plan endpoints require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// UTILITY & PRE-FLIGHT CALCULATIONS (AUTHENTICATED USERS)
// -----------------------------------------------------------------------------

router.post(
  '/next-billing-date',
  (req, res, next) => plansController.calculateNextBillingDate(req, res, next)
);

// -----------------------------------------------------------------------------
// READ OPERATIONS (ADMIN, STAFF, CUSTOMER)
// -----------------------------------------------------------------------------

router.get(
  '/',
  requirePermission('plans.read'),
  (req, res, next) => plansController.listPlans(req, res, next)
);

router.get(
  '/:id',
  requirePermission('plans.read'),
  (req, res, next) => plansController.getPlanById(req, res, next)
);

router.post(
  '/:id/validate-quantity',
  requirePermission('plans.read'),
  (req, res, next) => plansController.validateQuantity(req, res, next)
);

// -----------------------------------------------------------------------------
// PLAN MANAGEMENT MUTATIONS (ADMIN ONLY)
// -----------------------------------------------------------------------------

router.post(
  '/',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => plansController.createPlan(req, res, next)
);

router.patch(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => plansController.updatePlan(req, res, next)
);

router.patch(
  '/:id/status',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => plansController.updatePlanStatus(req, res, next)
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('plans.manage'),
  (req, res, next) => plansController.deletePlan(req, res, next)
);

export default router;
