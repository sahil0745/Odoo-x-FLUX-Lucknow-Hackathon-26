import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../modules/auth/auth.routes';
import staffRoutes from '../modules/staff/staff.routes';
import productsRoutes from '../modules/products/products.routes';
import plansRoutes from '../modules/plans/plans.routes';
import subscriptionsRoutes from '../modules/subscriptions/subscriptions.routes';
import { invoiceRoutes, billingRoutes } from '../modules/billing/invoices.routes';
import { paymentRoutes } from '../modules/payments/payments.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';

const v1Router = Router();

// Register public health check routes first
v1Router.use('/', healthRoutes);

// Register authenticated module routes under /api/v1
v1Router.use('/auth', authRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/products', productsRoutes);
v1Router.use('/plans', plansRoutes);
v1Router.use('/subscriptions', subscriptionsRoutes);
v1Router.use('/invoices', invoiceRoutes);
v1Router.use('/billing', billingRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/dashboard', dashboardRoutes);

export default v1Router;
