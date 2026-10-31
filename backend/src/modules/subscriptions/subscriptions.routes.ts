import { Router } from 'express';
import { subscriptionController } from './subscriptions.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// List and get details
router.get('/', requirePermission('subscriptions.read'), (req, res, next) =>
  subscriptionController.listSubscriptions(req, res, next)
);

router.get('/:id', requirePermission('subscriptions.read'), (req, res, next) =>
  subscriptionController.getSubscriptionById(req, res, next)
);

// Creation & conversion
router.post('/', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.createSubscription(req, res, next)
);

router.post('/convert', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.convertQuotation(req, res, next)
);

// Status updates
router.patch('/:id/status', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.updateStatus(req, res, next)
);

// Dedicated Lifecycle Routes per Blueprint
router.post('/:id/activate', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.activate(req, res, next)
);

router.post('/:id/pause', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.pause(req, res, next)
);

router.post('/:id/resume', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.resume(req, res, next)
);

router.post('/:id/close', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.close(req, res, next)
);

router.post('/:id/renew', requirePermission('subscriptions.manage'), (req, res, next) =>
  subscriptionController.renewSubscription(req, res, next)
);

export default router;
