import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);
router.get('/metrics', requireRole(UserRole.ADMIN, UserRole.STAFF), controller.getMetrics);

export { router as dashboardRoutes };
