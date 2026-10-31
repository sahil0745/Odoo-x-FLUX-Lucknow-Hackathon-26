import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardMetrics } from '../../types';
import { dashboardService } from '../../services/dashboardService';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Receipt,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

export const ExecutiveDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load executive dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center space-y-4">
        <Spinner className="w-8 h-8 text-indigo-400" />
        <p className="text-sm text-slate-400">Loading live business intelligence...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Dashboard Error</h3>
            <p className="text-sm">{error || 'Unable to load metrics'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Executive Welcome & Actions Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/40 border border-indigo-500/20 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Operations Center
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Executive & Staff Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time financial performance, recurring revenue cadence, and lifecycle analytics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="flex items-center space-x-1.5"
          >
            <Receipt className="w-4 h-4" />
            <span>Billing Engine</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/payments')}
            className="flex items-center space-x-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {/* Primary Financial & Subscription KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR */}
        <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monthly Recurring (MRR)
            </span>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            ${metrics.subscriptions.mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center space-x-1">
            <span className="text-emerald-400 font-semibold">{metrics.subscriptions.active}</span>
            <span>active recurring contracts</span>
          </div>
        </div>

        {/* Total Invoiced & Collections */}
        <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Revenue Collected
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            ${metrics.revenue.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Collection Rate: <span className="text-emerald-400 font-semibold">{metrics.revenue.collectionRatePercent}%</span> of ${metrics.revenue.totalInvoiced.toLocaleString()}
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Outstanding Balance Due
            </span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            ${metrics.revenue.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Pending customer invoice payments
          </div>
        </div>

        {/* Overdue Alert */}
        <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overdue Receivables
            </span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-400 mt-3">
            ${metrics.overdue.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            <span className="text-rose-400 font-semibold">{metrics.overdue.count}</span> overdue invoices requiring collection
          </div>
        </div>
      </div>

      {/* Secondary Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Subscription Statuses
            </div>
            <div className="flex items-center space-x-3 mt-2 text-xs">
              <span className="text-emerald-400">● {metrics.subscriptions.active} Active</span>
              <span className="text-amber-400">● {metrics.subscriptions.paused} Paused</span>
              <span className="text-slate-400">● {metrics.subscriptions.closed} Closed</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/subscriptions')}
            className="text-xs text-indigo-400"
          >
            Manage
          </Button>
        </div>

        <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Automated Billing Engine
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Deterministic deduplication cycle audit active
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/billing/logs')}
            className="text-xs text-indigo-400"
          >
            Audit Logs
          </Button>
        </div>

        <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Financial Integrity
            </div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Exact decimal snapshots enforced</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="text-xs text-indigo-400"
          >
            Invoices
          </Button>
        </div>
      </div>

      {/* Recent Invoices & Recent Payments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-indigo-400" />
              <span>Recent Invoices</span>
            </h3>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {metrics.recentInvoices.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No invoices generated yet</p>
            ) : (
              metrics.recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <span>{inv.invoiceNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{inv.customerName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">${inv.grandTotal.toFixed(2)}</div>
                    <div className="text-slate-400 text-[11px]">
                      {inv.balanceDue > 0 ? (
                        <span className="text-amber-400">Bal: ${inv.balanceDue.toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-400">Paid</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Recent Payments</span>
            </h3>
            <button
              onClick={() => navigate('/payments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {metrics.recentPayments.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No payments recorded yet</p>
            ) : (
              metrics.recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <span>{p.paymentReference}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{p.customerName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">+${p.amount.toFixed(2)}</div>
                    <div className="text-slate-400 text-[11px]">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
