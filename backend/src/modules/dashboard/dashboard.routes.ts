import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

// Blueprint Section 17 Routes
router.get('/overview', (req, res, next) => dashboardController.getOverview(req, res, next));
router.get('/revenue', (req, res, next) => dashboardController.getRevenue(req, res, next));
router.get('/subscriptions', (req, res, next) => dashboardController.getSubscriptions(req, res, next));
router.get('/invoices', (req, res, next) => dashboardController.getInvoices(req, res, next));
router.get('/', (req, res, next) => dashboardController.getDashboard(req, res, next));

export default router;
