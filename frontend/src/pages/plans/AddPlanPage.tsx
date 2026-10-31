import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Clock,
  RotateCw,
  PauseCircle,
  Hash,
  Boxes,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { planService } from '../../services/planService';
import { productService } from '../../services/productService';
import { BillingFrequency, CreatePlanPayload, Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const AddPlanPage: React.FC = () => {
  const navigate = useNavigate();

  // Active products for optional association
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('MONTHLY');
  const [intervalCount, setIntervalCount] = useState<number>(1);
  const [minimumQuantity, setMinimumQuantity] = useState<number>(1);
  const [availableFrom, setAvailableFrom] = useState(todayStr);
  const [availableUntil, setAvailableUntil] = useState('');
  const [allowAutoClose, setAllowAutoClose] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(false);
  const [allowRenewal, setAllowRenewal] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Submitting and Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        const res = await productService.getProducts({ isActive: true, limit: 100 });
        setAvailableProducts(res.data || []);
      } catch (err) {
        console.error('Failed to load active products for plan association', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

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
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePlanPayload = {
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
        isActive: true,
        associatedProductIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
      };

      const created = await planService.createPlan(payload);
      navigate(`/plans/${created.id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details?.[0]?.message ||
        err.message ||
        'Failed to create subscription plan';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Back Link */}
      <div className="flex items-center gap-3">
        <Link
          to="/plans"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Create Subscription Plan
          </h1>
          <p className="text-sm text-slate-400">
            Define pricing, billing cadences, minimum order quantities, and lifecycle rules
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
        {/* SECTION 1: BASIC PLAN INFORMATION */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Basic Plan Information</span>
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
                placeholder="e.g. Startup Monthly, Enterprise Annual, Cloud Core Plan"
                className={`w-full px-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${
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
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe target customer segment, included workspace capabilities, and plan highlights..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 2: PRICING & CADENCE */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Pricing & Billing Cadence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Recurring Plan Price <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  placeholder="199.99"
                  className={`w-full pl-8 pr-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${
                    fieldErrors.price
                      ? 'border-rose-500 focus:border-rose-400'
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {fieldErrors.price && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.price}</p>
              )}
            </div>

            {/* Billing Frequency */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Billing Frequency <span className="text-rose-400">*</span>
              </label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="DAILY">Daily (Every 1 Day)</option>
                <option value="WEEKLY">Weekly (Every 7 Days)</option>
                <option value="MONTHLY">Monthly (Calendar Month)</option>
                <option value="YEARLY">Yearly (Annual Cadence)</option>
              </select>
            </div>

            {/* Interval Count */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Interval Count</span>
                <span className="text-slate-500 font-normal lowercase">multiplier (e.g. 1, 3, 6)</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={intervalCount}
                onChange={(e) => {
                  setIntervalCount(parseInt(e.target.value) || 1);
                  if (fieldErrors.intervalCount)
                    setFieldErrors((prev) => ({ ...prev, intervalCount: '' }));
                }}
                className={`w-full px-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 focus:outline-none transition-colors ${
                  fieldErrors.intervalCount
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.intervalCount && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.intervalCount}</p>
              )}
            </div>

            {/* Minimum Quantity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Minimum Quantity <span className="text-rose-400">*</span></span>
                <span className="text-slate-500 font-normal lowercase">positive integer</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={minimumQuantity}
                  onChange={(e) => {
                    setMinimumQuantity(parseInt(e.target.value) || 1);
                    if (fieldErrors.minimumQuantity)
                      setFieldErrors((prev) => ({ ...prev, minimumQuantity: '' }));
                  }}
                  className={`w-full pl-9 pr-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 focus:outline-none transition-colors ${
                    fieldErrors.minimumQuantity
                      ? 'border-rose-500 focus:border-rose-400'
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
              {fieldErrors.minimumQuantity && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.minimumQuantity}</p>
              )}
            </div>
          </div>
        </Card>

        {/* SECTION 3: AVAILABILITY & CLOSING RULES */}
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
                onChange={(e) => {
                  setAvailableFrom(e.target.value);
                  if (fieldErrors.availableFrom)
                    setFieldErrors((prev) => ({ ...prev, availableFrom: '' }));
                }}
                className={`w-full px-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 focus:outline-none transition-colors ${
                  fieldErrors.availableFrom
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.availableFrom && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.availableFrom}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Available Until (Optional)</span>
                <span className="text-slate-500 font-normal lowercase">leave blank for indefinite</span>
              </label>
              <input
                type="date"
                value={availableUntil}
                onChange={(e) => {
                  setAvailableUntil(e.target.value);
                  if (fieldErrors.availableUntil)
                    setFieldErrors((prev) => ({ ...prev, availableUntil: '' }));
                }}
                className={`w-full px-4 py-2.5 bg-slate-950 border rounded-lg text-sm text-slate-200 focus:outline-none transition-colors ${
                  fieldErrors.availableUntil
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.availableUntil && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.availableUntil}</p>
              )}
            </div>
          </div>

          {/* Closing Flags */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={allowAutoClose}
                onChange={(e) => setAllowAutoClose(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">
                  Automatic Closing
                </span>
                <span className="text-xs text-slate-400">
                  Automatically close active subscriptions once their expiration period is reached.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={allowEarlyClose}
                onChange={(e) => setAllowEarlyClose(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block">
                  Early Closing Allowed
                </span>
                <span className="text-xs text-slate-400">
                  Allow customers or sales staff to terminate or close the subscription before its renewal date.
                </span>
              </div>
            </label>
          </div>
        </Card>

        {/* SECTION 4: PAUSE & RENEWAL SETTINGS */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-slate-200">
            <RotateCw className="w-4 h-4 text-purple-400" />
            <span>Pause & Renewal Settings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={allowPause}
                onChange={(e) => setAllowPause(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block flex items-center gap-1.5">
                  <PauseCircle className="w-4 h-4 text-blue-400" />
                  Allow Plan Pausing
                </span>
                <span className="text-xs text-slate-400">
                  Subscribers may pause recurring billing and service delivery temporarily.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={allowRenewal}
                onChange={(e) => setAllowRenewal(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-200 block flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-emerald-400" />
                  Permit Automatic Renewal
                </span>
                <span className="text-xs text-slate-400">
                  Allow subscriptions to automatically renew at the conclusion of each billing cycle.
                </span>
              </div>
            </label>
          </div>
        </Card>

        {/* SECTION 5: ASSOCIATE ACTIVE PRODUCTS (OPTIONAL) */}
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Boxes className="w-4 h-4 text-indigo-400" />
              <span>Associate Active Products (Optional)</span>
            </div>
            <span className="text-xs text-slate-400">
              {selectedProductIds.length} product(s) selected
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Link this plan with active products to automatically generate standard quotation templates.
          </p>

          {isLoadingProducts ? (
            <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
              <Spinner size="sm" />
              <span>Loading active products...</span>
            </div>
          ) : availableProducts.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No active products currently found in the catalog.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {availableProducts.map((prod) => {
                const isSelected = selectedProductIds.includes(prod.id);
                return (
                  <button
                    type="button"
                    key={prod.id}
                    onClick={() => toggleProductSelection(prod.id)}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block truncate">
                        {prod.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {prod.type} • ${prod.salesPrice}
                      </span>
                    </div>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'bg-indigo-500 text-white' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => navigate('/plans')}
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
                <span>Creating Plan...</span>
              </>
            ) : (
              <span>Save & Publish Plan</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
