import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Clock,
  RotateCw,
  Hash,
  Info,
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { planService } from '../../services/planService';
import { BillingFrequency, UpdatePlanPayload } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const EditPlanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('MONTHLY');
  const [intervalCount, setIntervalCount] = useState<number>(1);
  const [minimumQuantity, setMinimumQuantity] = useState<number>(1);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [allowAutoClose, setAllowAutoClose] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(false);
  const [allowRenewal, setAllowRenewal] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function loadPlan() {
      if (!id) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const plan = await planService.getPlanById(id);
        setName(plan.name);
        setDescription(plan.description || '');
        setPrice(plan.price);
        setBillingFrequency(plan.billingFrequency);
        setIntervalCount(plan.intervalCount);
        setMinimumQuantity(plan.minimumQuantity);
        setAvailableFrom(new Date(plan.availableFrom).toISOString().split('T')[0]);
        setAvailableUntil(
          plan.availableUntil ? new Date(plan.availableUntil).toISOString().split('T')[0] : ''
        );
        setAllowAutoClose(plan.allowAutoClose);
        setAllowEarlyClose(plan.allowEarlyClose);
        setAllowPause(plan.allowPause);
        setAllowRenewal(plan.allowRenewal);
        setIsActive(plan.isActive);
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.message || err.message || 'Failed to load plan for editing'
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadPlan();
  }, [id]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Plan name is mandatory.';
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price must be a valid number greater than or equal to 0.';
    }

    if (!Number.isInteger(intervalCount) || intervalCount < 1) {
      errors.intervalCount = 'Interval count must be a positive integer (at least 1).';
    }

    if (!Number.isInteger(minimumQuantity) || minimumQuantity < 1) {
      errors.minimumQuantity = 'Minimum quantity must be a positive integer (at least 1).';
    }

    if (!availableFrom) {
      errors.availableFrom = 'Availability start date is required.';
    }

    if (availableFrom && availableUntil) {
      if (new Date(availableUntil).getTime() < new Date(availableFrom).getTime()) {
        errors.availableUntil = 'Availability end date cannot precede start date.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdatePlanPayload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price).toFixed(2),
        billingFrequency,
        intervalCount,
        minimumQuantity,
        availableFrom: new Date(availableFrom).toISOString(),
        availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
        allowAutoClose,
        allowEarlyClose,
        allowPause,
        allowRenewal,
        isActive,
      };

      await planService.updatePlan(id, payload);
      navigate(`/plans/${id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details?.[0]?.message ||
        err.message ||
        'Failed to update subscription plan';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400">Loading plan configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Back Link */}
      <div className="flex items-center gap-3">
        <Link
          to={`/plans/${id}`}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Edit Subscription Plan</h1>
          <p className="text-sm text-slate-400">
            Update pricing, cadence, minimum quantities, and lifecycle parameters
          </p>
        </div>
      </div>

      {/* Historical Price Protection Notice */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3 text-xs text-indigo-300">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-indigo-200 block text-sm">Historical Price Immutability</strong>
          <p>
            Modifying this plan's current price will only apply to new subscription orders and future quotation drafts. Existing customer subscriptions, accepted quotations, and issued invoices preserve their historical prices.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Basic Plan Details</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Plan Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={`w-full px-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 focus:outline-none transition-colors ${
                  fieldErrors.name
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Pricing & Cadence */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Pricing & Billing Cadence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Price <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
                }}
                className={`w-full px-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 focus:outline-none transition-colors ${
                  fieldErrors.price
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.price && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Billing Frequency <span className="text-rose-400">*</span>
              </label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Interval Multiplier
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={intervalCount}
                onChange={(e) => setIntervalCount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Minimum Quantity <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={minimumQuantity}
                  onChange={(e) => setMinimumQuantity(parseInt(e.target.value) || 1)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Availability & Closing Rules */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Availability Window & Closing Rules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Available From <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Available Until (Optional)
              </label>
              <input
                type="date"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAutoClose}
                onChange={(e) => setAllowAutoClose(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Automatic Closing</span>
                <span className="text-xs text-slate-400">Auto close subscriptions at cycle end.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEarlyClose}
                onChange={(e) => setAllowEarlyClose(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Early Closing Allowed</span>
                <span className="text-xs text-slate-400">Subscribers or staff may close early.</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Pause & Renewal Flags */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <RotateCw className="w-4 h-4 text-purple-400" />
            <span>Pause, Renewal & Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPause}
                onChange={(e) => setAllowPause(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Allow Pausing</span>
                <span className="text-xs text-slate-400">Customers may pause plan.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRenewal}
                onChange={(e) => setAllowRenewal(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Allow Renewal</span>
                <span className="text-xs text-slate-400">Permit auto renewal.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Plan Active</span>
                <span className="text-xs text-slate-400">Available for new purchases.</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => navigate(`/plans/${id}`)}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex items-center gap-2 min-w-[140px] justify-center"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
