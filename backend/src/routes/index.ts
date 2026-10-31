import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../modules/auth/auth.routes';
import staffRoutes from '../modules/staff/staff.routes';
import customerRoutes from '../modules/customers/customers.routes';
import productRoutes from '../modules/products/products.routes';
import planRoutes from '../modules/plans/plans.routes';
import taxRoutes from '../modules/taxes/taxes.routes';
import discountRoutes from '../modules/discounts/discounts.routes';
import quotationRoutes from '../modules/quotations/quotations.routes';
import subscriptionRoutes from '../modules/subscriptions/subscriptions.routes';
import invoiceRoutes from '../modules/invoices/invoices.routes';
import paymentRoutes from '../modules/payments/payments.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';

const v1Router = Router();

// API Root Index - Welcome and Available Resources
v1Router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    application: 'Brightloop Subscription Management System API',
    version: '1.0.0',
    documentation: 'See API docs for endpoint details and schemas',
    endpoints: {
      health: 'GET /api/v1/health',
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
      },
      staff: '/api/v1/staff',
      customers: {
        base: '/api/v1/customers',
        subscriptions: 'GET /api/v1/customers/:id/subscriptions',
        quotations: 'GET /api/v1/customers/:id/quotations',
        invoices: 'GET /api/v1/customers/:id/invoices',
        payments: 'GET /api/v1/customers/:id/payments',
      },
      products: '/api/v1/products',
      plans: '/api/v1/plans',
      taxes: '/api/v1/taxes',
      discounts: {
        base: '/api/v1/discounts',
        validate: 'POST /api/v1/discounts/validate',
      },
      quotations: {
        base: '/api/v1/quotations',
        accept: 'POST /api/v1/quotations/:id/accept',
        reject: 'POST /api/v1/quotations/:id/reject',
        convert: 'POST /api/v1/quotations/:id/convert',
      },
      subscriptions: {
        base: '/api/v1/subscriptions',
        activate: 'POST /api/v1/subscriptions/:id/activate',
        pause: 'POST /api/v1/subscriptions/:id/pause',
        resume: 'POST /api/v1/subscriptions/:id/resume',
        close: 'POST /api/v1/subscriptions/:id/close',
        renew: 'POST /api/v1/subscriptions/:id/renew',
      },
      invoices: {
        base: '/api/v1/invoices',
        confirm: 'POST /api/v1/invoices/:id/confirm',
        cancel: 'POST /api/v1/invoices/:id/cancel',
        pdf: 'GET /api/v1/invoices/:id/pdf',
        generateRecurring: 'POST /api/v1/invoices/generate-recurring',
      },
      payments: {
        base: '/api/v1/payments',
        allocations: 'POST /api/v1/payments/:id/allocations',
      },
      dashboard: {
        overview: 'GET /api/v1/dashboard/overview',
        revenue: 'GET /api/v1/dashboard/revenue',
        subscriptions: 'GET /api/v1/dashboard/subscriptions',
        invoices: 'GET /api/v1/dashboard/invoices',
      },
    },
  });
});

// Register all modular API routes under /api/v1
v1Router.use('/auth', authRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/customers', customerRoutes);
v1Router.use('/products', productRoutes);
v1Router.use('/plans', planRoutes);
v1Router.use('/taxes', taxRoutes);
v1Router.use('/discounts', discountRoutes);
v1Router.use('/quotations', quotationRoutes);
v1Router.use('/subscriptions', subscriptionRoutes);
v1Router.use('/invoices', invoiceRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/', healthRoutes);

export default v1Router;
