import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

export const invoiceRoutes = Router();
export const billingRoutes = Router();

invoiceRoutes.use(authenticate);
billingRoutes.use(authenticate);

// Invoice retrieval & stats
invoiceRoutes.get(
  '/',
  requirePermission('invoices.read'),
  (req, res, next) => invoicesController.listInvoices(req, res, next)
);

invoiceRoutes.get(
  '/stats',
  requirePermission('invoices.read'),
  (req, res, next) => invoicesController.getBillingStats(req, res, next)
);

invoiceRoutes.get(
  '/:id',
  requirePermission('invoices.read'),
  (req, res, next) => invoicesController.getInvoiceById(req, res, next)
);

// Invoice status modification
invoiceRoutes.patch(
  '/:id/status',
  requirePermission('invoices.manage'),
  (req, res, next) => invoicesController.updateInvoiceStatus(req, res, next)
);

// Automated recurring billing engine trigger & execution logs
billingRoutes.post(
  '/run',
  requirePermission('invoices.manage'),
  (req, res, next) => invoicesController.triggerBillingRun(req, res, next)
);

billingRoutes.get(
  '/logs',
  requirePermission('invoices.manage'),
  (req, res, next) => invoicesController.listBillingLogs(req, res, next)
);
