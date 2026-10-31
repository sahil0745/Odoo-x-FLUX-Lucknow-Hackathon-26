import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  FileText,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  Users,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { DashboardOverview } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const overview = await dashboardService.getOverview();
      setData(overview);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-slate-500 text-sm">Aggregating real-time subscription metrics...</p>
      </div>
    );
  }

  const metrics = data?.metrics;
  const recent = data?.recentActivity;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.customerProfile?.contactName || user?.email}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'CUSTOMER'
              ? 'Your subscription overview, pending balances, and invoice history.'
              : 'Real-time billing performance, active subscriptions, and cashflow metrics.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          {user?.role !== 'CUSTOMER' && (
            <Link to="/quotations">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                New Quote
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchDashboard}>Retry</Button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex items-center justify-between text-indigo-100 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Recurring (MRR)</span>
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black">{formatCurrency(metrics?.monthlyRecurringRevenue)}</div>
          <div className="text-xs text-indigo-200 mt-2 flex items-center gap-1.5">
            <span>ARR:</span>
            <span className="font-semibold">{formatCurrency(metrics?.annualRecurringRevenue)}</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics?.activeSubscriptionsCount || 0}</div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
            <span className="text-amber-600 font-medium">{metrics?.pausedSubscriptionsCount || 0} Paused</span>
            <span>•</span>
            <span className="text-slate-400">{metrics?.closedSubscriptionsCount || 0} Closed</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(metrics?.totalRevenueCollected)}</div>
          <div className="text-xs text-slate-500 mt-2">
            <span>{metrics?.paidInvoicesCount || 0} Paid Invoices</span>
          </div>
        </div>

        {/* Overdue / Pending Invoices */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Balances</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(metrics?.pendingAmount)}</div>
          <div className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1.5">
            <span>{metrics?.overdueInvoicesCount || 0} overdue ({formatCurrency(metrics?.overdueAmount)})</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      {user?.role !== 'CUSTOMER' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/customers"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Customers</div>
              <div className="text-xs text-slate-500">{metrics?.totalCustomers || 0} Registered</div>
            </div>
          </Link>

          <Link
            to="/products"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2.5 rounded-lg bg-violet-100 text-violet-600 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Products</div>
              <div className="text-xs text-slate-500">{metrics?.totalProducts || 0} Active Items</div>
            </div>
          </Link>

          <Link
            to="/subscriptions"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 group-hover:scale-105 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Subscriptions</div>
              <div className="text-xs text-slate-500">{metrics?.activeSubscriptionsCount || 0} Active</div>
            </div>
          </Link>

          <Link
            to="/invoices"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Invoices</div>
              <div className="text-xs text-slate-500">{metrics?.totalInvoicesCount || 0} Total</div>
            </div>
          </Link>
        </div>
      )}

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Invoices */}
        <Card
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Recent Invoices</h3>
              </div>
              <Link to="/invoices" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          }
        >
          {(!recent?.invoices || recent.invoices.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-sm">No recent invoices recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100 -my-2">
              {recent.invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{inv.invoiceNumber}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {inv.customer?.companyName || inv.customer?.contactName || 'Customer'} • Due {new Date(inv.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</div>
                      {Number(inv.balanceDue) > 0 && (
                        <div className="text-xs text-rose-500 font-medium">Due: {formatCurrency(inv.balanceDue)}</div>
                      )}
                    </div>
                    <Badge
                      variant={
                        inv.status === 'PAID'
                          ? 'success'
                          : inv.status === 'CONFIRMED'
                          ? 'info'
                          : inv.status === 'CANCELLED'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Subscriptions */}
        <Card
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Recent Subscriptions</h3>
              </div>
              <Link to="/subscriptions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          }
        >
          {(!recent?.subscriptions || recent.subscriptions.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-sm">No active subscriptions yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 -my-2">
              {recent.subscriptions.map((sub) => (
                <div key={sub.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{sub.subscriptionNumber}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {sub.plan?.name || 'Standard Plan'} • Next: {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className="text-sm font-bold text-slate-900">{formatCurrency(sub.totalAmount)}</div>
                    <Badge
                      variant={
                        sub.status === 'ACTIVE'
                          ? 'success'
                          : sub.status === 'PAUSED'
                          ? 'warning'
                          : sub.status === 'CLOSED'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {sub.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
