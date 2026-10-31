import { Router } from 'express';
import { invoiceController } from './invoices.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// List and single detail
router.get('/', requirePermission('invoices.read'), (req, res, next) =>
  invoiceController.listInvoices(req, res, next)
);

// Blueprint standard: POST /invoices (creates invoice)
router.post('/', requirePermission('invoices.manage'), (req, res, next) =>
  invoiceController.createManualInvoice(req, res, next)
);

router.get('/:id', requirePermission('invoices.read'), (req, res, next) =>
  invoiceController.getInvoiceById(req, res, next)
);

// Blueprint PDF endpoint
router.get('/:id/pdf', requirePermission('invoices.read'), (req, res, next) =>
  invoiceController.getInvoicePdf(req, res, next)
);

// Blueprint Dedicated Confirmation & Cancellation Endpoints
router.post('/:id/confirm', requirePermission('invoices.manage'), (req, res, next) =>
  invoiceController.confirmInvoice(req, res, next)
);

router.post('/:id/cancel', requirePermission('invoices.manage'), (req, res, next) =>
  invoiceController.cancelInvoice(req, res, next)
);

// Recurring billing operations
router.post('/generate-recurring', requirePermission('invoices.manage'), (req, res, next) =>
  invoiceController.generateRecurringInvoice(req, res, next)
);

router.post('/process-due', requirePermission('invoices.manage'), (req, res, next) =>
  invoiceController.processDueBilling(req, res, next)
);

router.patch('/:id/status', requirePermission('invoices.manage'), (req, res, next) =>
  invoiceController.updateInvoiceStatus(req, res, next)
);

export default router;
