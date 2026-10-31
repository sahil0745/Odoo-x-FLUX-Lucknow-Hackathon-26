import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { WelcomePage } from '../pages/WelcomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { StaffManagementPage } from '../pages/admin/StaffManagementPage';
import { ProductListPage } from '../pages/products/ProductListPage';
import { AddProductPage } from '../pages/products/AddProductPage';
import { ProductDetailsPage } from '../pages/products/ProductDetailsPage';
import { EditProductPage } from '../pages/products/EditProductPage';
import { PlanListPage } from '../pages/plans/PlanListPage';
import { AddPlanPage } from '../pages/plans/AddPlanPage';
import { PlanDetailsPage } from '../pages/plans/PlanDetailsPage';
import { EditPlanPage } from '../pages/plans/EditPlanPage';
import { InvoiceListPage } from '../pages/invoices/InvoiceListPage';
import { InvoiceDetailsPage } from '../pages/invoices/InvoiceDetailsPage';
import { BillingLogsPage } from '../pages/invoices/BillingLogsPage';
import { SubscriptionListPage } from '../pages/subscriptions/SubscriptionListPage';
import { PaymentListPage } from '../pages/payments/PaymentListPage';
import { ExecutiveDashboardPage } from '../pages/dashboard/ExecutiveDashboardPage';
import { CustomerPortalPage } from '../pages/portal/CustomerPortalPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <AppLayout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Product Catalog & Management Routes */}
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <ProductListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AddProductPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <ProductDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <EditProductPage />
            </ProtectedRoute>
          }
        />

        {/* Subscription Plan Management Routes */}
        <Route
          path="/plans"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <PlanListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AddPlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <PlanDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <EditPlanPage />
            </ProtectedRoute>
          }
        />

        {/* Subscriptions & Contracts */}
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <SubscriptionListPage />
            </ProtectedRoute>
          }
        />

        {/* Invoices & Recurring Billing */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <InvoiceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <InvoiceDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <BillingLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Payments Management */}
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <PaymentListPage />
            </ProtectedRoute>
          }
        />

        {/* Executive & Staff Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <ExecutiveDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Self-Service Portal */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
              <CustomerPortalPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <StaffManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
};
