import React, { useState } from 'react';
import { PaymentMethod, UnpaidCustomerInvoice, RecordPaymentPayload } from '../../types';
import { paymentService } from '../../services/paymentService';
import { X, CreditCard, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedCustomerId?: string;
  preselectedInvoiceId?: string;
  preselectedAmount?: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCustomerId = '',
  preselectedInvoiceId = '',
  preselectedAmount = 0,
}) => {
  const [customerId, setCustomerId] = useState<string>(preselectedCustomerId);
  const [amount, setAmount] = useState<number>(preselectedAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [notes, setNotes] = useState<string>('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidCustomerInvoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    if (preselectedInvoiceId && preselectedAmount > 0) {
      return { [preselectedInvoiceId]: preselectedAmount };
    }
    return {};
  });

  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchInvoices = async () => {
    if (!customerId.trim()) {
      setErrorMessage('Please enter a Customer UUID');
      return;
    }
    setLoadingInvoices(true);
    setErrorMessage(null);
    try {
      const invs = await paymentService.getCustomerUnpaidInvoices(customerId.trim());
      setUnpaidInvoices(invs);
      if (invs.length === 0) {
        setErrorMessage('No unpaid invoices found for this customer profile.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch customer invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: Math.max(0, val),
    }));
  };

  const handleAllocateFull = (inv: UnpaidCustomerInvoice) => {
    setAllocations((prev) => ({
      ...prev,
      [inv.id]: inv.balanceDue,
    }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const remainingToAllocate = Math.max(0, amount - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amount <= 0) {
      setErrorMessage('Payment amount must be greater than zero');
      return;
    }

    if (totalAllocated > amount + 0.001) {
      setErrorMessage(
        `Total allocated ($${totalAllocated.toFixed(2)}) exceeds payment amount ($${amount.toFixed(2)})`
      );
      return;
    }

    const allocationList = Object.entries(allocations)
      .filter(([_, val]) => val > 0)
      .map(([invoiceId, val]) => ({ invoiceId, amount: val }));

    const payload: RecordPaymentPayload = {
      customerId: customerId.trim(),
      amount,
      paymentMethod,
      notes: notes.trim() || undefined,
      allocations: allocationList.length > 0 ? allocationList : undefined,
    };

    setSubmitting(true);
    try {
      await paymentService.recordPayment(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Record Payment
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Register transaction & allocate funds directly to invoices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Customer Profile UUID *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleFetchInvoices}
                  disabled={loadingInvoices}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Fetch</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="BANK_TRANSFER">Bank Transfer (ACH / Wire)</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
                <option value="CHECK">Check</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other / Gateway</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Notes & Reference Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Check #, Wire reference, or txn notes"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Invoice Allocations section */}
          {unpaidInvoices.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Select Invoices for Allocation
                </span>
                <span className="text-xs text-slate-500">
                  Allocated: ${totalAllocated.toFixed(2)} | Remaining: ${remainingToAllocate.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {unpaidInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>{inv.invoiceNumber}</span>
                        <span className="text-slate-400 font-normal">
                          (Due: {new Date(inv.dueDate).toLocaleDateString()})
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Total: ${inv.grandTotal.toFixed(2)} | Balance Due: ${inv.balanceDue.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAllocateFull(inv)}
                        className="px-2 py-1 text-[11px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded font-medium"
                      >
                        Full (${inv.balanceDue.toFixed(2)})
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={inv.balanceDue}
                        placeholder="0.00"
                        value={allocations[inv.id] || ''}
                        onChange={(e) =>
                          handleAllocationChange(inv.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Payment (${amount.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
