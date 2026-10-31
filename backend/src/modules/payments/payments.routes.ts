import { Router } from 'express';
import { paymentController } from './payments.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// List and single detail
router.get('/', requirePermission('payments.read'), (req, res, next) =>
  paymentController.listPayments(req, res, next)
);

router.get('/:id', requirePermission('payments.read'), (req, res, next) =>
  paymentController.getPaymentById(req, res, next)
);

// Record payment (Staff / Admin)
router.post('/', requirePermission('payments.manage'), (req, res, next) =>
  paymentController.recordPayment(req, res, next)
);

// Blueprint Dedicated: POST /payments/:id/allocations
router.post('/:id/allocations', requirePermission('payments.manage'), (req, res, next) =>
  paymentController.allocatePayment(req, res, next)
);

export default router;
