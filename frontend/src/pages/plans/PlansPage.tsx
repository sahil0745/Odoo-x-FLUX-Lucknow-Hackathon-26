import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  Repeat,
  Archive,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { planService } from '../../services/planService';
import { SubscriptionPlan, BillingFrequency, CreatePlanPayload } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [frequencyFilter, setFrequencyFilter] = useState<string>('ALL');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [planForm, setPlanForm] = useState<CreatePlanPayload>({
    name: '',
    description: '',
    price: 0,
    billingFrequency: 'MONTHLY',
    intervalCount: 1,
    minimumQuantity: 1,
    allowAutoClose: false,
    allowEarlyClose: true,
    allowPause: false,
    allowRenewal: true,
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await planService.listPlans({
        billingFrequency: frequencyFilter !== 'ALL' ? (frequencyFilter as BillingFrequency) : undefined,
      });
      setPlans(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [frequencyFilter]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await planService.createPlan(planForm);
      setSuccessMessage('Subscription plan created successfully!');
      setShowModal(false);
      setPlanForm({
        name: '',
        description: '',
        price: 0,
        billingFrequency: 'MONTHLY',
        intervalCount: 1,
        minimumQuantity: 1,
        allowAutoClose: false,
        allowEarlyClose: true,
        allowPause: false,
        allowRenewal: true,
      });
      fetchPlans();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create plan');
    }
  };

  const handleDeactivatePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive or deactivate this plan?')) return;
    try {
      const res = await planService.deletePlan(id);
      setSuccessMessage(res.message);
      fetchPlans();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to deactivate plan');
    }
  };

  const getCadenceColor = (freq: BillingFrequency) => {
    switch (freq) {
      case 'DAILY':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
      case 'WEEKLY':
        return 'text-sky-400 border-sky-500/20 bg-sky-500/10';
      case 'MONTHLY':
        return 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10';
      case 'YEARLY':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Subscription Plans & Billing Cadences
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Configure automated recurring billing terms across Daily, Weekly, Monthly, and Annual schedules.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan</span>
          </Button>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cadence Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((freq) => (
          <button
            key={freq}
            onClick={() => setFrequencyFilter(freq)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              frequencyFilter === freq
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {freq === 'ALL' ? 'All Frequencies' : freq}
          </button>
        ))}
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner className="w-8 h-8 text-indigo-400" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="text-center py-16 bg-slate-900/40 border-slate-800">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-200">No subscription plans found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {frequencyFilter !== 'ALL'
              ? `No active plans under '${frequencyFilter}' frequency.`
              : 'Create your first recurring pricing plan to begin generating quotations and billing.'}
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Plan
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                plan.isActive
                  ? 'border-slate-800 hover:border-slate-700 shadow-md'
                  : 'border-slate-800/40 opacity-70 bg-slate-950'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mt-1 ${getCadenceColor(
                        plan.billingFrequency
                      )}`}
                    >
                      {plan.billingFrequency} (Every {plan.intervalCount}{' '}
                      {plan.billingFrequency.toLowerCase()})
                    </span>
                  </div>
                  {!plan.isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Archived
                    </span>
                  )}
                </div>

                {/* Price display */}
                <div className="my-4 pb-4 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      ${Number(plan.price).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">
                      /{plan.billingFrequency.toLowerCase()}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{plan.description}</p>
                  )}
                </div>

                {/* Metadata & Rules */}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Min Order Quantity:</span>
                    <span className="font-semibold text-slate-200">
                      {plan.minimumQuantity} {plan.minimumQuantity === 1 ? 'seat' : 'seats'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Allow Pause:</span>
                    <span className="flex items-center gap-1 font-medium">
                      {plan.allowPause ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Yes
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" /> No
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Auto Renewal:</span>
                    <span className="flex items-center gap-1 font-medium">
                      {plan.allowRenewal ? (
                        <>
                          <Repeat className="w-3.5 h-3.5 text-emerald-400" /> Enabled
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" /> Disabled
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Early Cancellation:</span>
                    <span className="flex items-center gap-1 font-medium">
                      {plan.allowEarlyClose ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Allowed
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" /> Locked
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom footer */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{plan._count?.subscriptions || 0} Subscriptions</span>
                </span>

                {isAdmin && plan.isActive && (
                  <button
                    onClick={() => handleDeactivatePlan(plan.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Plan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create Subscription Plan</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Enterprise Annual"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Billing Cadence *
                  </label>
                  <select
                    value={planForm.billingFrequency}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        billingFrequency: e.target.value as BillingFrequency,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={planForm.price}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="99.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Interval Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.intervalCount}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, intervalCount: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">e.g. 1 month, 3 months</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Min Quantity (Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.minimumQuantity}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, minimumQuantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={planForm.description || ''}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Target customer tier or plan details..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Checkbox Options */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allowPause}
                    onChange={(e) => setPlanForm({ ...planForm, allowPause: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Allow Customer Pause</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allowRenewal}
                    onChange={(e) => setPlanForm({ ...planForm, allowRenewal: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Enable Auto-Renewal</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allowEarlyClose}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, allowEarlyClose: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Allow Early Cancel</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allowAutoClose}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, allowAutoClose: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Auto-close on Expiry</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
