import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { Subscription, SubscriptionStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Detail Modal
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const list = await subscriptionService.getSubscriptions();
      setSubscriptions(list);
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      await subscriptionService.activateSubscription(id);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to activate subscription');
    }
  };

  const handlePause = async (id: string) => {
    const reason = prompt('Reason for pausing subscription:');
    try {
      await subscriptionService.pauseSubscription(id, reason || undefined);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to pause subscription');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await subscriptionService.resumeSubscription(id);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to resume subscription');
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Are you sure you want to close/cancel this subscription?')) return;
    const reason = prompt('Cancellation / closure reason:');
    try {
      await subscriptionService.closeSubscription(id, reason || undefined);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to close subscription');
    }
  };

  const handleRenew = async (id: string) => {
    try {
      await subscriptionService.renewSubscription(id);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to renew subscription');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">ACTIVE</Badge>;
      case 'PAUSED':
        return <Badge variant="warning">PAUSED</Badge>;
      case 'CLOSED':
        return <Badge variant="danger">CLOSED</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info">CONFIRMED</Badge>;
      case 'DRAFT':
      case 'QUOTATION':
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (selectedStatus === 'ALL') return true;
    return s.status === selectedStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subscription lifecycles, billing schedules, pause/resumes, and renewals.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubscriptions}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'ACTIVE', 'PAUSED', 'CONFIRMED', 'CLOSED', 'DRAFT'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStatus === st
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Subscription Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading active subscriptions...</p>
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No subscriptions found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {selectedStatus !== 'ALL'
              ? `No subscriptions currently marked as ${selectedStatus}.`
              : 'Subscriptions will appear here when quotations are accepted or converted.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Subscription ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Plan Cadence</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Next Billing</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center">Lifecycle Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-500" />
                        <span>{sub.subscriptionNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                        Started {new Date(sub.startDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800">
                        {sub.customer?.companyName || sub.customer?.contactName || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-400">{sub.customer?.user?.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">{sub.plan?.name || 'Standard'}</div>
                      <div className="text-xs text-indigo-600 font-medium">
                        {sub.plan?.billingFrequency} (x{sub.plan?.intervalCount || 1})
                      </div>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(sub.status)}</td>
                    <td className="py-4 px-6 text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                      ${Number(sub.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSub(sub);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Status specific transitions */}
                        {sub.status === 'CONFIRMED' && isAdminOrStaff && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleActivate(sub.id)}
                          >
                            <Play className="w-3 h-3 mr-1" /> Activate
                          </Button>
                        )}

                        {sub.status === 'ACTIVE' && isAdminOrStaff && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 hover:bg-amber-50"
                              onClick={() => handlePause(sub.id)}
                            >
                              <Pause className="w-3 h-3 mr-1" /> Pause
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleClose(sub.id)}
                            >
                              Close
                            </Button>
                          </>
                        )}

                        {sub.status === 'PAUSED' && isAdminOrStaff && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleResume(sub.id)}
                            >
                              <Play className="w-3 h-3 mr-1" /> Resume
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleClose(sub.id)}
                            >
                              Close
                            </Button>
                          </>
                        )}

                        {sub.status === 'CLOSED' && isAdminOrStaff && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRenew(sub.id)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Renew
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Subscription Detail */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Subscription: ${selectedSub?.subscriptionNumber || ''}`}
        description="Subscription line items, billing intervals, and customer record."
        maxWidth="lg"
      >
        {selectedSub && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {selectedSub.customer?.companyName || selectedSub.customer?.contactName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Billing Plan:</span>
                <span className="font-semibold text-indigo-600 text-sm">
                  {selectedSub.plan?.name} ({selectedSub.plan?.billingFrequency})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Next Automatic Invoice:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {new Date(selectedSub.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Renewal Counter:</span>
                <span className="text-xs text-slate-700">{selectedSub.renewalCount} renewals completed</span>
              </div>
            </div>

            {/* Line items */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Included Products</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedSub.lines || selectedSub.items || []).map((it) => {
                      const vName = it.variant
                        ? it.variant.name ||
                          `${it.variant.variantType ? it.variant.variantType + ' - ' : ''}${it.variant.variantValue || 'Standard'}`
                        : null;
                      return (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {it.product?.name || 'Item'}
                            {vName && (
                              <span className="text-[11px] text-indigo-600 ml-1">({vName})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right">${Number(it.unitPrice).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold">${Number(it.lineTotal).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm">Recurring Charge:</span>
              <span className="font-black text-indigo-600 text-lg">
                ${Number(selectedSub.totalAmount).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
