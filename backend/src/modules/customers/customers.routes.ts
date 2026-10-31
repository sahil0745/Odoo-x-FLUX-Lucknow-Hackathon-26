import { Router } from 'express';
import { customerController } from './customers.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Staff / Admin list & create customer
router.get('/', requirePermission('users.read'), (req, res, next) =>
  customerController.listCustomers(req, res, next)
);

router.post('/', requirePermission('users.manage'), (req, res, next) =>
  customerController.createCustomer(req, res, next)
);

// Get single customer (customer can view self, staff/admin can view any)
router.get('/:id', (req, res, next) =>
  customerController.getCustomerById(req, res, next)
);

// Update customer profile
router.patch('/:id', (req, res, next) =>
  customerController.updateCustomerProfile(req, res, next)
);

// Customer Sub-Resources
router.get('/:id/subscriptions', (req, res, next) =>
  customerController.getSubscriptions(req, res, next)
);

router.get('/:id/quotations', (req, res, next) =>
  customerController.getQuotations(req, res, next)
);

router.get('/:id/invoices', (req, res, next) =>
  customerController.getInvoices(req, res, next)
);

router.get('/:id/payments', (req, res, next) =>
  customerController.getPayments(req, res, next)
);

export default router;
