import { Router } from 'express';
import { subscriptionsController } from './subscriptions.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('subscriptions.read'),
  (req, res, next) => subscriptionsController.listSubscriptions(req, res, next)
);

router.get(
  '/:id',
  requirePermission('subscriptions.read'),
  (req, res, next) => subscriptionsController.getSubscriptionById(req, res, next)
);

router.post(
  '/',
  requirePermission('subscriptions.manage'),
  (req, res, next) => subscriptionsController.createSubscription(req, res, next)
);

router.patch(
  '/:id/status',
  requirePermission('subscriptions.manage'),
  (req, res, next) => subscriptionsController.updateSubscriptionStatus(req, res, next)
);

export default router;
