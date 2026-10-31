import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../modules/auth/auth.routes';
import staffRoutes from '../modules/staff/staff.routes';
import productRoutes from '../modules/products/product.routes';
import planRoutes from '../modules/plans/plan.routes';

const v1Router = Router();

// Register module routes under /api/v1
v1Router.use('/auth', authRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/products', productRoutes);
v1Router.use('/plans', planRoutes);
v1Router.use('/', healthRoutes);

export default v1Router;
