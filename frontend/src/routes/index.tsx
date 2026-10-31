import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { WelcomePage } from '../pages/WelcomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { StaffManagementPage } from '../pages/admin/StaffManagementPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsPage } from '../pages/ProductsPage';
import { PlansPage } from '../pages/PlansPage';
import { QuotationsPage } from '../pages/QuotationsPage';
import { SubscriptionsPage } from '../pages/SubscriptionsPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { CustomersPage } from '../pages/CustomersPage';
import { TaxesDiscountsPage } from '../pages/TaxesDiscountsPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AppLayout>
      <Routes>
        {/* Landing / Welcome or Auto-redirect to Dashboard */}
        <Route
          path="/"
          element={
            isLoading ? (
              <div className="py-20 flex justify-center">Loading...</div>
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <WelcomePage />
            )
          }
        />

        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Public Catalog Routes */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/plans" element={<PlansPage />} />

        {/* General Authenticated Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations"
          element={
            <ProtectedRoute>
              <QuotationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Staff & Admin Only Routes */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/taxes-discounts"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <TaxesDiscountsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Only Routes */}
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
