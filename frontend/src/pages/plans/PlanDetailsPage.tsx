import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Edit3,
  Power,
  Trash2,
  Clock,
  Boxes,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calculator,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { planService } from '../../services/planService';
import { SubscriptionPlan, QuantityValidationResult, BillingCycleResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const PlanDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status toggle & delete modals
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Minimum Quantity Validation Sandbox State
  const [testQuantity, setTestQuantity] = useState<number>(1);
  const [isValidatingQty, setIsValidatingQty] = useState(false);
  const [qtyResult, setQtyResult] = useState<QuantityValidationResult | null>(null);

  // Next Billing Date Simulator State
  const todayStr = new Date().toISOString().split('T')[0];
  const [simStartDate, setSimStartDate] = useState(todayStr);
  const [isSimulatingCycle, setIsSimulatingCycle] = useState(false);
  const [simCycleResult, setSimCycleResult] = useState<BillingCycleResult | null>(null);

  const fetchPlanDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await planService.getPlanById(id);
      setPlan(data);
      setTestQuantity(data.minimumQuantity);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to load plan details'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlanDetails();
  }, [fetchPlanDetails]);

  const handleToggleStatus = async () => {
    if (!plan) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await planService.updatePlanStatus(plan.id, !plan.isActive);
      setPlan(updated);
      setSuccessMessage(
        `Plan '${plan.name}' has been ${!plan.isActive ? 'activated' : 'deactivated'} successfully.`
      );
      setShowStatusModal(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update plan status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    setIsDeleting(true);
    try {
      await planService.deletePlan(plan.id);
      navigate('/plans');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to delete plan');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleValidateQuantity = async () => {
    if (!plan) return;
    setIsValidatingQty(true);
    try {
      const result = await planService.validateQuantity(plan.id, testQuantity);
      setQtyResult(result);
    } catch (err: any) {
      setQtyResult({
        isValid: false,
        error: err.response?.data?.message || 'Quantity validation failed',
        requestedQuantity: testQuantity,
        minimumQuantity: plan.minimumQuantity,
      });
    } finally {
      setIsValidatingQty(false);
    }
  };

  const handleSimulateCycle = async () => {
    if (!plan) return;
    setIsSimulatingCycle(true);
    try {
      const cycle = await planService.calculateNextBillingDate(
        new Date(simStartDate).toISOString(),
        plan.billingFrequency,
        plan.intervalCount
      );
      setSimCycleResult(cycle);
    } catch (err: any) {
      console.error('Cycle simulation error:', err);
    } finally {
      setIsSimulatingCycle(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400">Loading plan specifications...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto bg-slate-900 border-slate-800">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Subscription Plan Not Found</h2>
        <p className="text-sm text-slate-400 mt-1 mb-4">
          The requested plan does not exist or may have been deleted.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/plans')}>
          Back to Plans List
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/plans"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h1>
              {plan.isActive ? (
                <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Active
                </Badge>
              ) : (
                <Badge variant="neutral" className="bg-slate-800 text-slate-400 border-slate-700">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Plan ID: <span className="font-mono text-slate-300">{plan.id}</span>
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/plans/${plan.id}/edit`)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>Edit Plan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusModal(true)}
              className={`flex items-center gap-1.5 ${
                plan.isActive
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{plan.isActive ? 'Deactivate' : 'Activate'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-slate-500 hover:text-rose-400"
              title="Delete Plan"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-bold text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Plan Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing & Cadence Card */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Billing Cadence & Pricing
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {plan.billingFrequency}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <div>
                <span className="text-4xl font-extrabold text-white tracking-tight">
                  {plan.currency} {plan.price}
                </span>
                <span className="text-slate-400 text-sm ml-2">/ {plan.cadenceFormatted}</span>
              </div>
              <span className="text-xs text-slate-400">
                Interval Multiplier: <strong className="text-slate-200">{plan.intervalCount}</strong>
              </span>
            </div>

            {plan.description && (
              <p className="text-sm text-slate-300 leading-relaxed pt-2 border-t border-slate-800/80">
                {plan.description}
              </p>
            )}
          </Card>

          {/* Availability & Lifecycle Specs */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Availability & Lifecycle Policy</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Availability Window</span>
                <div className="font-semibold text-slate-200">
                  {new Date(plan.availableFrom).toISOString().split('T')[0]} to{' '}
                  {plan.availableUntil
                    ? new Date(plan.availableUntil).toISOString().split('T')[0]
                    : 'Indefinite (No Expiration)'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Current Availability State</span>
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {plan.availabilityStatus}
                </div>
              </div>
            </div>

            {/* Lifecycle Rules Checkpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className={`w-2 h-2 rounded-full ${plan.allowAutoClose ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span>Automatic Closing: <strong>{plan.allowAutoClose ? 'Enabled' : 'Disabled'}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className={`w-2 h-2 rounded-full ${plan.allowEarlyClose ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span>Early Closing Allowed: <strong>{plan.allowEarlyClose ? 'Yes' : 'No'}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className={`w-2 h-2 rounded-full ${plan.allowPause ? 'bg-blue-400' : 'bg-slate-600'}`} />
                <span>Plan Pausing: <strong>{plan.allowPause ? 'Allowed' : 'Not Allowed'}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className={`w-2 h-2 rounded-full ${plan.allowRenewal ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span>Automatic Renewal: <strong>{plan.allowRenewal ? 'Permitted' : 'Disabled'}</strong></span>
              </div>
            </div>
          </Card>

          {/* Associated Products Section */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-400" />
                Bundled & Associated Catalog Products
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {plan.associatedProducts?.length || 0} associated
              </span>
            </div>

            {plan.associatedProducts && plan.associatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plan.associatedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block truncate">{prod.name}</span>
                      <span className="text-[11px] text-slate-400">{prod.type}</span>
                    </div>
                    <span className="font-mono text-slate-300 font-semibold">
                      ${prod.salesPrice}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No catalog products are currently bundled with this plan template.
              </p>
            )}
          </Card>
        </div>

        {/* Right Column: Interactive Sandboxes */}
        <div className="space-y-6">
          {/* SANDBOX 1: MINIMUM QUANTITY VALIDATOR */}
          <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Calculator className="w-4 h-4" />
              <span>Minimum Quantity Validator</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Plan minimum required quantity: <strong className="text-white">{plan.minimumQuantity}</strong>. Test subscription quantities against server-side enforcement.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-300 mb-1">
                  Test Quantity
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={testQuantity}
                    onChange={(e) => setTestQuantity(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isValidatingQty}
                    onClick={handleValidateQuantity}
                  >
                    {isValidatingQty ? <Spinner size="sm" /> : 'Validate'}
                  </Button>
                </div>
              </div>

              {qtyResult && (
                <div
                  className={`p-3 rounded-lg border text-xs animate-fadeIn ${
                    qtyResult.isValid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {qtyResult.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Valid Order Quantity</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Quantity Rejected</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] opacity-90">
                    {qtyResult.isValid
                      ? `Quantity ${qtyResult.requestedQuantity} meets or exceeds the minimum of ${qtyResult.minimumQuantity}.`
                      : qtyResult.error}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* SANDBOX 2: NEXT BILLING DATE CALCULATOR */}
          <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-teal-400">
              <CalendarCheck className="w-4 h-4" />
              <span>Next Billing Date Simulator</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates calendar-aware renewal dates using the business engine with month-end and leap-year rules.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-300 mb-1">
                  Subscription Start Date
                </label>
                <input
                  type="date"
                  value={simStartDate}
                  onChange={(e) => setSimStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-teal-300 hover:text-white"
                disabled={isSimulatingCycle}
                onClick={handleSimulateCycle}
              >
                {isSimulatingCycle ? <Spinner size="sm" /> : 'Calculate Cycle Dates'}
              </Button>

              {simCycleResult && (
                <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-xs text-teal-200 space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between">
                    <span className="text-teal-400">Period Start:</span>
                    <span className="font-mono text-white">
                      {simCycleResult.periodStart.split('T')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-400">Next Billing Date:</span>
                    <span className="font-mono text-white font-bold">
                      {simCycleResult.nextBillingDate.split('T')[0]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Status Toggle Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Power className="w-5 h-5 text-indigo-400" />
              {plan.isActive ? 'Deactivate Plan?' : 'Activate Plan?'}
            </h3>
            <p className="text-sm text-slate-300 mt-2">
              {plan.isActive
                ? `Deactivating '${plan.name}' will prevent customers and sales staff from creating new subscriptions with this plan. Existing subscriptions and quotations will remain unaffected.`
                : `Activating '${plan.name}' will make it immediately available for new subscriptions.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant={plan.isActive ? 'danger' : 'primary'}
                size="sm"
                disabled={isUpdatingStatus}
                onClick={handleToggleStatus}
              >
                {isUpdatingStatus ? <Spinner size="sm" /> : plan.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              Delete Subscription Plan
            </h3>
            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to permanently delete plan{' '}
              <strong className="text-white">'{plan.name}'</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-2 p-3 rounded bg-slate-950 border border-slate-800">
              Note: Plans referenced by existing customer subscriptions, quotations, or templates cannot be deleted and must be deactivated instead.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeletePlan}
              >
                {isDeleting ? <Spinner size="sm" /> : 'Confirm Deletion'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
