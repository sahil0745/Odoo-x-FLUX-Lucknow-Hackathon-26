import React, { useState, useEffect } from 'react';
import { Payment, PaymentStats, PaymentMethod } from '../../types';
import { paymentService } from '../../services/paymentService';
import { RecordPaymentModal } from './RecordPaymentModal';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const PaymentListPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsData, statsData] = await Promise.all([
        paymentService.getPayments({
          paymentMethod: methodFilter !== 'ALL' ? methodFilter : undefined,
          search: search || undefined,
        }),
        paymentService.getPaymentStats(),
      ]);
      setPayments(paymentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [methodFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const toggleExpand = (id: string) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id));
  };

  const getMethodBadgeClass = (method: PaymentMethod) => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'BANK_TRANSFER':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'CHECK':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'CASH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Payment Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              M08 Module
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track transactions, multi-invoice allocations, and outstanding settlements
          </p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Collected
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            ${stats?.totalCollected?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Lifetime collections</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              This Month
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            ${stats?.thisMonthCollected?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Current billing month</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Transactions
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats?.totalPaymentsCount || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Settled receipts</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bank vs Card
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 space-y-1">
            <div className="flex justify-between">
              <span>ACH / Wire:</span>
              <span>${stats?.methodBreakdown?.['BANK_TRANSFER']?.toFixed(0) || 0}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Card / Other:</span>
              <span>
                $
                {(
                  (stats?.methodBreakdown?.['CREDIT_CARD'] || 0) +
                  (stats?.methodBreakdown?.['OTHER'] || 0)
                ).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payment reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Methods</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="CHECK">Check</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No payments recorded
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Payments recorded against customer accounts and allocated to invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Payment Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Allocated</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Unallocated</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Allocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {payments.map((p) => {
                  const isExpanded = expandedPaymentId === p.id;
                  const allocationsCount = p.allocations?.length || 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{p.paymentReference}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {p.customer?.companyName || p.customer?.contactName || 'Customer'}
                          </div>
                          {p.customer?.contactEmail && (
                            <div className="text-xs text-slate-400">{p.customer.contactEmail}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getMethodBadgeClass(
                              p.paymentMethod
                            )}`}
                          >
                            {p.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                          ${p.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          ${p.totalAllocated.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          ${p.unallocatedAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {allocationsCount > 0 ? (
                            <button
                              onClick={() => toggleExpand(p.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
                            >
                              <span>{allocationsCount} inv</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable allocations panel */}
                      {isExpanded && p.allocations && (
                        <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                          <td colSpan={8} className="p-4">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Allocated Invoices Breakdown
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {p.allocations.map((alloc) => (
                                  <div
                                    key={alloc.id}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs flex justify-between items-center"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-900 dark:text-white">
                                        {alloc.invoice?.invoiceNumber || alloc.invoiceId}
                                      </div>
                                      <div className="text-slate-400 text-[11px]">
                                        Total: ${alloc.invoice?.grandTotal?.toFixed?.(2) || '—'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                        +${alloc.allocatedAmount.toFixed(2)}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        Bal: ${alloc.invoice?.balanceDue?.toFixed?.(2) || '0.00'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};
