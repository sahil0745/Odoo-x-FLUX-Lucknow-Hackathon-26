import { Router } from 'express';
import { quotationController } from './quotations.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Templates (Staff / Admin)
router.get('/templates', requirePermission('quotations.read'), (req, res, next) =>
  quotationController.listTemplates(req, res, next)
);

router.post('/templates', requirePermission('quotations.manage'), (req, res, next) =>
  quotationController.createTemplate(req, res, next)
);

// Quotations list and detail
router.get('/', requirePermission('quotations.read'), (req, res, next) =>
  quotationController.listQuotations(req, res, next)
);

router.get('/:id', requirePermission('quotations.read'), (req, res, next) =>
  quotationController.getQuotationById(req, res, next)
);

// Create quotation (Staff / Admin)
router.post('/', requirePermission('quotations.manage'), (req, res, next) =>
  quotationController.createQuotation(req, res, next)
);

// General status update
router.patch('/:id/status', requirePermission('quotations.read'), (req, res, next) =>
  quotationController.updateQuotationStatus(req, res, next)
);

// Blueprint Dedicated Endpoints: /accept, /reject, /convert
router.post('/:id/accept', (req, res, next) =>
  quotationController.acceptQuotation(req, res, next)
);

router.post('/:id/reject', (req, res, next) =>
  quotationController.rejectQuotation(req, res, next)
);

router.post('/:id/convert', requirePermission('subscriptions.manage'), (req, res, next) =>
  quotationController.convertQuotation(req, res, next)
);

export default router;
