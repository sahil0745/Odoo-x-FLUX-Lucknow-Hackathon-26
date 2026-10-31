import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { planService } from '../services/planService';
import { Plan, BillingFrequency } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('MONTHLY');
  const [intervalCount, setIntervalCount] = useState<number>(1);
  const [trialDays, setTrialDays] = useState<number>(14);
  const [isRenewable, setIsRenewable] = useState<boolean>(true);
  const [autoCloseAfterDays, setAutoCloseAfterDays] = useState<string>('30');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const list = await planService.getPlans();
      setPlans(list);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await planService.createPlan({
        name: planName.trim(),
        description: description.trim() || undefined,
        billingFrequency,
        intervalCount: Number(intervalCount) || 1,
        trialDays: Number(trialDays) || 0,
        isRenewable,
        autoCloseAfterDays: autoCloseAfterDays ? parseInt(autoCloseAfterDays) : undefined,
      });
      setIsCreateOpen(false);
      setPlanName('');
      setDescription('');
      fetchPlans();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  const getFrequencyLabel = (freq: BillingFrequency, interval: number) => {
    if (interval === 1) {
      switch (freq) {
        case 'DAILY':
          return 'Daily Billing';
        case 'WEEKLY':
          return 'Weekly Billing';
        case 'MONTHLY':
          return 'Monthly Billing';
        case 'YEARLY':
          return 'Annual Billing';
      }
    }
    return `Every ${interval} ${freq.toLowerCase()}s`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define recurring billing cycles, trial durations, auto-close limits, and renewal rules.
          </p>
        </div>
        {isAdminOrStaff && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Subscription Plan
          </Button>
        )}
      </div>

      {/* Plan Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading subscription plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No subscription plans found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            Configure flexible monthly, annual, weekly, or custom interval plans for your customers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant={
                      plan.billingFrequency === 'YEARLY'
                        ? 'success'
                        : plan.billingFrequency === 'MONTHLY'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {plan.billingFrequency}
                  </Badge>
                  {plan.isActive ? (
                    <span className="inline-flex items-center text-xs text-emerald-600 font-medium gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-slate-400 gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Inactive
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{plan.name}</h3>
                <p className="text-xs font-semibold text-indigo-600 mt-1">
                  {getFrequencyLabel(plan.billingFrequency, plan.intervalCount)}
                </p>

                <p className="text-sm text-slate-500 mt-3 line-clamp-3">
                  {plan.description || 'Flexible subscription plan for Brightloop clients.'}
                </p>

                {/* Features & Policies */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      Trial Period: <strong className="text-slate-800">{plan.trialDays} days</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      Auto-Renewal: <strong className="text-slate-800">{plan.isRenewable ? 'Enabled' : 'Disabled'}</strong>
                    </span>
                  </div>

                  {plan.autoCloseAfterDays && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>
                        Grace Closure: <strong className="text-slate-800">{plan.autoCloseAfterDays} days unpaid</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Created {new Date(plan.createdAt || Date.now()).toLocaleDateString()}</span>
                {isAdminOrStaff && (
                  <span className="text-indigo-600 font-semibold hover:underline cursor-pointer">
                    Manage Rules
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Plan */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Subscription Plan"
        description="Establish billing intervals and lifecycle rules."
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plan Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise Monthly Rolling"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Frequency</label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="YEARLY">YEARLY</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Interval Multiplier</label>
              <input
                type="number"
                min="1"
                required
                value={intervalCount}
                onChange={(e) => setIntervalCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trial Period (Days)</label>
              <input
                type="number"
                min="0"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Auto-Close Unpaid (Days)</label>
              <input
                type="number"
                min="0"
                value={autoCloseAfterDays}
                onChange={(e) => setAutoCloseAfterDays(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isRenewable"
              checked={isRenewable}
              onChange={(e) => setIsRenewable(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="isRenewable" className="text-xs font-semibold text-slate-700">
              Automatic Renewal Enabled by Default
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Terms and SLA guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Plan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
