import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../modules/auth/auth.routes';
import staffRoutes from '../modules/staff/staff.routes';
import productsRoutes from '../modules/products/products.routes';
import plansRoutes from '../modules/plans/plans.routes';

const v1Router = Router();

// Register module routes under /api/v1
v1Router.use('/auth', authRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/products', productsRoutes);
v1Router.use('/plans', plansRoutes);
v1Router.use('/', healthRoutes);

export default v1Router;
