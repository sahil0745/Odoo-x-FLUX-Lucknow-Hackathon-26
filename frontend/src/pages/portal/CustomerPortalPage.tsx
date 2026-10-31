import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscriptionService } from '../../services/subscriptionService';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import { Subscription, Invoice, Payment } from '../../types';
import {
  Layers,
  Receipt,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices' | 'payments'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [subsData, invoicesData, paymentsData] = await Promise.all([
          subscriptionService.listSubscriptions(),
          invoiceService.listInvoices(),
          paymentService.getPayments(),
        ]);
        setSubscriptions(subsData);
        setInvoices(invoicesData);
        setPayments(paymentsData);
      } catch (err: any) {
        setError(err?.message || 'Failed to load customer account records');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  const totalOutstandingBalance = invoices
    .filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const activeSubscriptionsCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center space-y-3">
        <Spinner className="w-8 h-8 text-indigo-400" />
        <p className="text-sm text-slate-400">Loading your customer portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}
      {/* Account Overview Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Customer Portal</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Welcome back, {user?.customerProfile?.contactName || user?.email}
            </h1>
            <p className="text-sm text-slate-400">
              Manage your active subscription agreements, itemized tax invoices, and payment receipts
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Total Balance Due</div>
              <div className={`text-xl font-black ${totalOutstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                ${totalOutstandingBalance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('subscriptions')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-indigo-950/40 border-indigo-500 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Contracts
            </span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{activeSubscriptionsCount}</div>
          <span className="text-xs text-slate-400 mt-1 block">Ongoing billing cycles</span>
        </div>

        <div
          onClick={() => setActiveTab('invoices')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-indigo-950/40 border-indigo-500 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Invoices
            </span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{invoices.length}</div>
          <span className="text-xs text-slate-400 mt-1 block">Itemized statements</span>
        </div>

        <div
          onClick={() => setActiveTab('payments')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-indigo-950/40 border-indigo-500 text-white'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Payments Settled
            </span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{payments.length}</div>
          <span className="text-xs text-slate-400 mt-1 block">Completed receipts</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          My Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          My Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          My Payment Receipts ({payments.length})
        </button>
      </div>

      {/* TAB 1: Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          {subscriptions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              You do not have any subscription agreements yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white text-base">
                        {sub.plan?.name || 'Subscription Plan'}
                      </span>
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {sub.subscriptionNumber}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                      <span>Started: {new Date(sub.startDate).toLocaleDateString()}</span>
                      <span>Next Bill Date: {new Date(sub.nextBillingDate).toLocaleDateString()}</span>
                      <span>Cadence: {sub.plan?.cadenceFormatted || 'Recurring'}</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center justify-between sm:justify-end space-x-4">
                    <div>
                      <div className="text-lg font-black text-white">
                        ${sub.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">{sub.currency} / cycle</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No invoices generated for your account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Invoice #</th>
                    <th className="py-3 px-4 font-semibold">Issue Date</th>
                    <th className="py-3 px-4 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                    <th className="py-3 px-4 font-semibold text-right">Paid</th>
                    <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        ${inv.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400">
                        ${inv.paidAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        <span className={inv.balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'}>
                          ${inv.balanceDue.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : inv.status === 'CONFIRMED'
                              ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          View / Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Method</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold text-right">Allocated</th>
                    <th className="py-3 px-4 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {p.paymentReference}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        ${p.totalAllocated.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
