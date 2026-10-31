import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Eye,
  Edit3,
  Power,
  Trash2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  RotateCw,
  PauseCircle,
  Hash,
  Boxes,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { planService } from '../../services/planService';
import { SubscriptionPlan, BillingFrequency, PlanAvailabilityStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const PlanListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Status toggle modal
  const [planToToggle, setPlanToToggle] = useState<SubscriptionPlan | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Delete modal
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params: any = {
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
        billingFrequency: (selectedFrequency as BillingFrequency) || undefined,
        isActive:
          selectedStatus === 'active'
            ? true
            : selectedStatus === 'inactive'
            ? false
            : undefined,
        availability:
          selectedAvailability !== 'all' ? selectedAvailability : undefined,
      };

      const res = await planService.getPlans(params);
      setPlans(res.plans || []);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to load subscription plans'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedFrequency, selectedStatus, selectedAvailability]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleToggleStatus = async () => {
    if (!planToToggle) return;
    setIsUpdatingStatus(true);
    try {
      await planService.updatePlanStatus(planToToggle.id, !planToToggle.isActive);
      setSuccessMessage(
        `Plan '${planToToggle.name}' ${
          !planToToggle.isActive ? 'activated' : 'deactivated'
        } successfully.`
      );
      setPlanToToggle(null);
      fetchPlans();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to update plan status'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      const res = await planService.deletePlan(planToDelete.id);
      setSuccessMessage(res.message);
      setPlanToDelete(null);
      fetchPlans();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to delete plan'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getAvailabilityBadge = (status: PlanAvailabilityStatus, isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="neutral" className="bg-slate-800 text-slate-400 border-slate-700">
          Inactive
        </Badge>
      );
    }
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Available
          </Badge>
        );
      case 'UPCOMING':
        return (
          <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            Upcoming
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge variant="danger" className="bg-rose-500/10 text-rose-400 border-rose-500/30">
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="bg-slate-800 text-slate-400">
            {status}
          </Badge>
        );
    }
  };

  const getFrequencyBadge = (freq: BillingFrequency) => {
    switch (freq) {
      case 'DAILY':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">Daily</span>;
      case 'WEEKLY':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">Weekly</span>;
      case 'MONTHLY':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Monthly</span>;
      case 'YEARLY':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Yearly</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Subscription Plans
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {totalCount} total
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Configure billing cadences, minimum quantities, availability windows, and renewal terms
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => navigate('/plans/new')}
            className="flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </Button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 animate-fadeIn">
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
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 animate-fadeIn">
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

      {/* Filters Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by plan name or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Billing Frequency Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedFrequency}
              onChange={(e) => {
                setSelectedFrequency(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Frequencies</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {/* Status Filter (Admin/Staff only) */}
          {isAdmin ? (
            <div className="md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          ) : (
            <div className="md:col-span-2">
              <select
                value={selectedAvailability}
                onChange={(e) => {
                  setSelectedAvailability(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="all">All Available</option>
                <option value="available">Open Now</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          )}

          {/* Refresh Action */}
          <div className="md:col-span-2 flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPlans}
              className="w-full flex items-center justify-center gap-1.5 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Plans List Table / Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">Loading subscription plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">No subscription plans found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            {searchTerm || selectedFrequency || selectedStatus
              ? 'No plans matched your filter criteria. Try adjusting your search keywords or resetting filters.'
              : 'No subscription plans have been created yet.'}
          </p>
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/plans/new')}
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create First Plan
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-5 transition-all duration-200 border-slate-800 flex flex-col justify-between hover:border-slate-700 bg-slate-900/80 ${
                !plan.isActive ? 'opacity-70 bg-slate-950/40' : ''
              }`}
            >
              <div className="space-y-4">
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors">
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getFrequencyBadge(plan.billingFrequency)}
                      {getAvailabilityBadge(plan.availabilityStatus, plan.isActive)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-extrabold text-white tracking-tight">
                      {plan.currency} {plan.price}
                    </span>
                    <p className="text-[11px] text-slate-400 font-medium">
                      / {plan.billingFrequency.toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Plan Description */}
                {plan.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {plan.description}
                  </p>
                )}

                {/* Key Plan Specs */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Min Quantity:</span>
                    <span className="font-semibold text-slate-200">
                      {plan.minimumQuantity}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cadence:</span>
                    <span className="font-semibold text-slate-200">
                      {plan.intervalCount === 1 ? '1 cycle' : `${plan.intervalCount} intervals`}
                    </span>
                  </div>
                </div>

                {/* Lifecycle & Renewal Flags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {plan.allowRenewal && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <RotateCw className="w-3 h-3" /> Auto-Renewal
                    </span>
                  )}
                  {plan.allowPause && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <PauseCircle className="w-3 h-3" /> Pause Allowed
                    </span>
                  )}
                  {plan.allowEarlyClose && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Early Close
                    </span>
                  )}
                </div>

                {/* Associated Products Preview */}
                {plan.associatedProducts && plan.associatedProducts.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                    <div className="flex items-center gap-1 text-slate-400 mb-1">
                      <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-slate-300">
                        {plan.associatedProducts.length} Bundled Product(s)
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {plan.associatedProducts.map((p) => p.name).join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/plans/${plan.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </Button>

                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/plans/${plan.id}/edit`)}
                      className="text-slate-400 hover:text-indigo-400 p-2"
                      title="Edit Plan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanToToggle(plan)}
                      className={`p-2 ${
                        plan.isActive
                          ? 'text-emerald-400 hover:text-amber-400'
                          : 'text-slate-500 hover:text-emerald-400'
                      }`}
                      title={plan.isActive ? 'Deactivate Plan' : 'Activate Plan'}
                    >
                      <Power className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanToDelete(plan)}
                      className="text-slate-400 hover:text-rose-400 p-2"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-sm">
          <span className="text-slate-400">
            Page <span className="text-white font-medium">{page}</span> of{' '}
            <span className="text-white font-medium">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Status Toggle Confirmation Modal */}
      {planToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Power className="w-5 h-5 text-indigo-400" />
              {planToToggle.isActive ? 'Deactivate Plan?' : 'Activate Plan?'}
            </h3>
            <p className="text-sm text-slate-300 mt-2">
              {planToToggle.isActive
                ? `Deactivating '${planToToggle.name}' will prevent customers and sales staff from creating new subscriptions with this plan. Existing subscriptions and quotations will remain unaffected.`
                : `Activating '${planToToggle.name}' will make it immediately available for new subscriptions.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => setPlanToToggle(null)}
              >
                Cancel
              </Button>
              <Button
                variant={planToToggle.isActive ? 'danger' : 'primary'}
                size="sm"
                disabled={isUpdatingStatus}
                onClick={handleToggleStatus}
              >
                {isUpdatingStatus ? (
                  <Spinner size="sm" />
                ) : planToToggle.isActive ? (
                  'Deactivate'
                ) : (
                  'Activate'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              Delete Subscription Plan
            </h3>
            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to permanently delete plan{' '}
              <strong className="text-white">'{planToDelete.name}'</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-2 p-3 rounded bg-slate-950 border border-slate-800">
              Note: Plans referenced by existing customer subscriptions, quotations, or templates cannot be deleted and must be deactivated instead.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setPlanToDelete(null)}
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
