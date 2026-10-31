import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import { customerService } from '../services/customerService';
import { invoiceService } from '../services/invoiceService';
import { Payment, PaymentMethod, CustomerProfile, Invoice } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState<string>('100.00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const list = await paymentService.getPayments();
      setPayments(list);

      if (isAdminOrStaff) {
        const [custs, invs] = await Promise.all([
          customerService.getCustomers(),
          invoiceService.getInvoices({ status: 'CONFIRMED' }),
        ]);
        setCustomers(custs);
        setOpenInvoices(invs);
      }
    } catch (err: any) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const customerId = isAdminOrStaff ? selectedCustomerId : user?.customerProfile?.id;
    if (!customerId) {
      setActionError('Customer is required');
      return;
    }

    const payAmount = parseFloat(amount) || 0;
    if (payAmount <= 0) {
      setActionError('Payment amount must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      await paymentService.recordPayment({
        customerId,
        amount: payAmount,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: selectedInvoiceId
          ? [{ invoiceId: selectedInvoiceId, amount: payAmount }]
          : undefined,
      });
      setIsRecordOpen(false);
      setAmount('');
      setTransactionRef('');
      setNotes('');
      fetchPayments();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case 'CREDIT_CARD':
        return <Badge variant="info">CREDIT CARD</Badge>;
      case 'BANK_TRANSFER':
        return <Badge variant="success">BANK TRANSFER</Badge>;
      case 'CHECK':
        return <Badge variant="warning">CHECK</Badge>;
      default:
        return <Badge variant="neutral">{m}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Receipts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit recorded customer transactions and invoice balance allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayments}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          {isAdminOrStaff && (
            <Button onClick={() => setIsRecordOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading payment records...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No payment receipts found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            Recorded receipts and automatic gateway allocations will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Payment Reference</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Method</th>
                  <th className="py-3.5 px-6">Payment Date</th>
                  <th className="py-3.5 px-6 text-right">Amount Paid</th>
                  <th className="py-3.5 px-6 text-center">Allocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span>{p.paymentReference}</span>
                      </div>
                      {p.transactionRef && (
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          Ref: {p.transactionRef}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800">
                        {p.customer?.companyName || p.customer?.contactName || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-400">{p.customer?.user?.email}</div>
                    </td>
                    <td className="py-4 px-6">{getMethodBadge(p.paymentMethod)}</td>
                    <td className="py-4 px-6 text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-emerald-600 text-base">
                      ${Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(p);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {p.allocations?.length || 0} Invoices
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Payment Receipt"
        description="Log an incoming customer payment and allocate to outstanding invoices."
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {isAdminOrStaff && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.contactName})` : c.contactName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CREDIT_CARD">CREDIT CARD</option>
                <option value="BANK_TRANSFER">BANK TRANSFER / WIRE</option>
                <option value="CHECK">CHECK</option>
                <option value="CASH">CASH</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Allocate to Specific Invoice (Optional FIFO Auto-allocation)
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Auto-allocate (FIFO across oldest unpaid invoices)</option>
              {openInvoices
                .filter((inv) => !selectedCustomerId || inv.customerId === selectedCustomerId)
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — Balance Due: ${Number(inv.balanceDue).toFixed(2)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Gateway / Transaction Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-STRIPE-9823471"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Payment Allocations */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Payment: ${selectedPayment?.paymentReference || ''}`}
        description="Allocations across settled invoices."
        maxWidth="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  ${Number(selectedPayment.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-semibold text-slate-800">{selectedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-700">
                  {new Date(selectedPayment.paymentDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Invoice Allocations</h4>
              {(!selectedPayment.allocations || selectedPayment.allocations.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No specific invoice allocations recorded.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Invoice</th>
                        <th className="py-2.5 px-3 text-right">Amount Allocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPayment.allocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {alloc.invoice?.invoiceNumber || alloc.invoiceId}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ${Number((alloc as any).allocatedAmount ?? alloc.amount ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
