import { Router } from 'express';
import { planController } from './plans.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

// Public / Customer / Staff catalog read
router.get('/', (req, res, next) =>
  planController.listPlans(req, res, next)
);

router.get('/:id', (req, res, next) =>
  planController.getPlanById(req, res, next)
);

// Admin & Staff plan management
router.post('/', authenticate, requirePermission('plans.manage'), (req, res, next) =>
  planController.createPlan(req, res, next)
);

router.patch('/:id', authenticate, requirePermission('plans.manage'), (req, res, next) =>
  planController.updatePlan(req, res, next)
);

router.delete('/:id', authenticate, requirePermission('plans.manage'), (req, res, next) =>
  planController.deletePlan(req, res, next)
);

export default router;
