import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();
const controller = new PaymentsController();

router.use(authenticate);

router.get('/stats', requirePermission('payments.read'), controller.getPaymentStats);
router.get(
  '/customers/:customerId/unpaid-invoices',
  requirePermission('payments.read'),
  controller.getCustomerUnpaidInvoices
);
router.get('/', requirePermission('payments.read'), controller.listPayments);
router.post('/', requirePermission('payments.manage'), controller.recordPayment);
router.get('/:id', requirePermission('payments.read'), controller.getPaymentById);

export { router as paymentRoutes };
