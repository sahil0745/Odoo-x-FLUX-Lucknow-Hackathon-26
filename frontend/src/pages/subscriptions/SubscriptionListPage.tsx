import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  XCircle,
  FileText,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscriptionService } from '../../services/subscriptionService';
import { Subscription, SubscriptionStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const SubscriptionListPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionService.listSubscriptions({
        status: statusFilter !== 'ALL' ? (statusFilter as SubscriptionStatus) : undefined,
        search: search || undefined,
      });
      setSubscriptions(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const handleStatusChange = async (id: string, newStatus: SubscriptionStatus, reason?: string) => {
    if (!window.confirm(`Are you sure you want to transition this subscription to ${newStatus}?`)) return;
    try {
      setError(null);
      await subscriptionService.updateSubscriptionStatus(id, {
        status: newStatus,
        reason: reason || `Updated to ${newStatus} by ${user?.email}`,
      });
      setSuccessMessage(`Subscription status updated to ${newStatus}`);
      fetchSubscriptions();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || `Failed to update subscription to ${newStatus}`);
    }
  };

  const getStatusBadgeVariant = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'CONFIRMED':
        return 'info';
      case 'PAUSED':
        return 'warning';
      case 'DRAFT':
        return 'neutral';
      case 'CLOSED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Subscription Agreements & Lifecycle
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Active agreements driving automated recurring billing cycles, renewals, and pauses.
          </p>
        </div>

        <Link to="/invoices">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 self-start md:self-auto">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>View Invoices</span>
          </Button>
        </Link>
      </div>

      {/* Messages */}
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

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['ALL', 'ACTIVE', 'PAUSED', 'CONFIRMED', 'DRAFT', 'CLOSED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All Subscriptions' : status}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchSubscriptions(); }} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SUB number..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Subscriptions Table */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner className="w-8 h-8 text-indigo-400" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-200">No subscriptions found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'Try modifying your search query.' : 'Subscriptions will appear here when contracts are activated.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Subscription #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Plan / Cadence</th>
                  <th className="py-3.5 px-4 font-semibold">Next Billing Date</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  {canManage && <th className="py-3.5 px-4 font-semibold text-right">Lifecycle Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {sub.customer?.companyName || sub.customer?.contactName}
                      </div>
                      <div className="text-xs text-slate-500">{sub.customer?.contactName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold">{sub.plan?.name}</div>
                      <div className="text-xs text-indigo-400">{sub.plan?.billingFrequency}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-300 font-medium">
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </div>
                      <div className="text-slate-500">Renews: {sub.renewalCount}x</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">
                      ${sub.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(sub.status)}>
                        {sub.status}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleStatusChange(sub.id, 'ACTIVE')}
                              className="text-xs p-1 px-2"
                            >
                              <Play className="w-3 h-3 mr-1" /> Activate
                            </Button>
                          )}

                          {sub.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStatusChange(sub.id, 'PAUSED')}
                              className="text-xs p-1 px-2"
                            >
                              <Pause className="w-3 h-3 mr-1" /> Pause
                            </Button>
                          )}

                          {sub.status === 'PAUSED' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleStatusChange(sub.id, 'ACTIVE')}
                              className="text-xs p-1 px-2"
                            >
                              <Play className="w-3 h-3 mr-1" /> Resume
                            </Button>
                          )}

                          {sub.status !== 'CLOSED' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleStatusChange(sub.id, 'CLOSED', 'Early customer termination')}
                              className="text-xs p-1 px-2"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Close
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
