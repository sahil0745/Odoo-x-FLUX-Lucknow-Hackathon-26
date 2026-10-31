import React, { useState, useEffect } from 'react';
import {
  FileText,
  Play,
  Search,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  X,
  History,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { invoiceService } from '../../services/invoiceService';
import { Invoice, InvoiceStatus, BillingStats, BillingRunSummary } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const InvoiceListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCustomer = user?.role === 'CUSTOMER';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Billing Run Modal
  const [showRunModal, setShowRunModal] = useState(false);
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [runningBilling, setRunningBilling] = useState(false);
  const [runSummary, setRunSummary] = useState<BillingRunSummary | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const isOverdue = statusFilter === 'OVERDUE';
      const statusParam =
        statusFilter !== 'ALL' && statusFilter !== 'OVERDUE'
          ? (statusFilter as InvoiceStatus)
          : undefined;

      const [invoicesData, statsData] = await Promise.all([
        invoiceService.listInvoices({
          status: statusParam,
          isOverdue: isOverdue ? true : undefined,
          search: search || undefined,
        }),
        invoiceService.getBillingStats(),
      ]);

      setInvoices(invoicesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleTriggerBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRunningBilling(true);
      setError(null);
      const summary = await invoiceService.triggerBillingRun({
        asOfDate: runDate ? new Date(runDate).toISOString() : undefined,
      });
      setRunSummary(summary);
      setSuccessMessage(
        `Billing run complete: ${summary.generated} invoices generated, ${summary.skipped} skipped (deduplicated), ${summary.failed} failed.`
      );
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Billing cycle trigger failed');
    } finally {
      setRunningBilling(false);
    }
  };

  const getStatusBadgeVariant = (status: InvoiceStatus, isOverdue?: boolean) => {
    if (isOverdue) return 'danger';
    switch (status) {
      case 'PAID':
        return 'success';
      case 'CONFIRMED':
        return 'info';
      case 'DRAFT':
        return 'warning';
      case 'CANCELLED':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Invoices & Recurring Billing
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isCustomer
              ? 'Review your billed invoices, payment status, and download records.'
              : 'Automated recurring billing engine, immutable invoice snapshots, and payment status tracking.'}
          </p>
        </div>

        {!isCustomer && (
          <div className="flex items-center gap-3">
            <Link to="/billing/logs">
              <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-slate-300">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Billing Audit Logs</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setRunSummary(null);
                setShowRunModal(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run Billing Engine</span>
            </Button>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Invoiced</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-white">
              ${stats.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{stats.totalInvoices} total invoices issued</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Collected Revenue</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-400">
              ${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{stats.statusBreakdown.paid} invoices fully paid</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Outstanding Balance</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-400">
              ${stats.totalBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{stats.statusBreakdown.confirmed} pending settlement</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Overdue Invoices</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-400">{stats.overdueCount}</div>
            <div className="text-xs text-slate-500 mt-1">Past legal due date</div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['ALL', 'CONFIRMED', 'PAID', 'DRAFT', 'OVERDUE', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All Invoices' : status}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by INV number..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Invoices List Table */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner className="w-8 h-8 text-indigo-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-200">No invoices found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? 'Try modifying your search criteria.'
              : 'Invoices will appear here once recurring billing cycles are triggered from active subscriptions.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Billing Period</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Grand Total</th>
                  <th className="py-3.5 px-4 font-semibold">Balance Due</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <Link to={`/invoices/${inv.id}`} className="hover:text-indigo-400 transition-colors">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {inv.customer?.companyName || inv.customer?.contactName}
                      </div>
                      <div className="text-xs text-slate-500">{inv.customer?.contactName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(inv.billingPeriodStart).toLocaleDateString()} -{' '}
                      {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className={inv.isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">
                      ${inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          inv.balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        ${inv.balanceDue.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(inv.status, inv.isOverdue)}>
                        {inv.isOverdue ? 'OVERDUE' : inv.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 p-1.5"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Trigger Billing Run */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-400" />
                <span>Execute Automated Billing Cycle</span>
              </h3>
              <button onClick={() => setShowRunModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTriggerBilling} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                The recurring billing engine will evaluate all active subscriptions with next billing dates up to the selected cutoff date.
                Zero duplicate invoices will be generated due to database-level deduplication logs.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cutoff Date (As of Date) *
                </label>
                <input
                  type="date"
                  required
                  value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {runSummary && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="font-bold text-white">Execution Result Summary:</div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-slate-900 p-2 rounded">
                      <div className="text-slate-400">Processed</div>
                      <div className="text-base font-bold text-white">{runSummary.processed}</div>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-500/20 p-2 rounded">
                      <div className="text-emerald-400">Generated</div>
                      <div className="text-base font-bold text-emerald-300">{runSummary.generated}</div>
                    </div>
                    <div className="bg-indigo-950/40 border border-indigo-500/20 p-2 rounded">
                      <div className="text-indigo-400">Skipped</div>
                      <div className="text-base font-bold text-indigo-300">{runSummary.skipped}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setShowRunModal(false)}>
                  Close
                </Button>
                <Button variant="primary" type="submit" disabled={runningBilling}>
                  {runningBilling ? (
                    <>
                      <Spinner className="w-4 h-4 mr-1.5" /> Processing...
                    </>
                  ) : (
                    'Run Billing Engine Now'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
