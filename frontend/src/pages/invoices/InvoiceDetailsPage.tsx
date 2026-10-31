import React, { useState, useEffect } from 'react';
import {
  Printer,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  X,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { invoiceService } from '../../services/invoiceService';
import { Invoice, InvoiceStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';

export const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchInvoice = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice || !window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
    try {
      setError(null);
      const updated = await invoiceService.updateInvoiceStatus(invoice.id, {
        status: newStatus,
        notes: `Status changed to ${newStatus} by ${user?.email}`,
      });
      setInvoice(updated);
      setActionSuccess(`Invoice status successfully updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || `Failed to update status to ${newStatus}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Spinner className="w-8 h-8 text-indigo-400" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/invoices')} className="flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Button>
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Error Loading Invoice</h3>
            <p className="text-sm">{error || 'Invoice not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: InvoiceStatus, isOverdue?: boolean) => {
    if (isOverdue) return 'danger';
    switch (status) {
      case 'PAID':
        return 'success';
      case 'CONFIRMED':
        return 'info';
      case 'DRAFT':
        return 'warning';
      case 'CANCELLED':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-1.5 text-slate-300 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </Button>

          {canManage && invoice.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange('CONFIRMED')}
              className="flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm Invoice</span>
            </Button>
          )}

          {canManage && invoice.status !== 'CANCELLED' && invoice.balanceDue > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </Button>
          )}

          {canManage && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleStatusChange('CANCELLED')}
              className="flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 print:hidden">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="ml-auto text-emerald-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Printable Invoice Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl print:shadow-none print:border-none print:bg-white print:text-black print:p-0">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-slate-800 print:border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
                BL
              </div>
              <span className="text-2xl font-black text-white tracking-tight print:text-black">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 print:text-gray-500">
              Subscription Management & Recurring Revenue Engine<br />
              Lucknow Technology Park, Uttar Pradesh<br />
              billing@brightloop.io
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 print:text-gray-500">
              TAX INVOICE
            </span>
            <div className="text-2xl font-extrabold text-white tracking-tight mt-0.5 print:text-black">
              {invoice.invoiceNumber}
            </div>
            <div className="mt-2 flex items-center sm:justify-end gap-2">
              <Badge variant={getStatusBadgeVariant(invoice.status, invoice.isOverdue)}>
                {invoice.isOverdue ? 'OVERDUE' : invoice.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bill To & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-800 print:border-gray-200 text-xs">
          {/* Client Details */}
          <div>
            <div className="font-bold text-slate-400 uppercase tracking-wider mb-2 print:text-gray-500">
              Billed To:
            </div>
            <div className="text-base font-bold text-white print:text-black">
              {invoice.customer?.companyName || invoice.customer?.contactName}
            </div>
            <div className="text-slate-300 print:text-gray-700 mt-1">
              Contact: {invoice.customer?.contactName}
            </div>
            {invoice.customer?.billingAddress && (
              <div className="text-slate-400 print:text-gray-600 mt-0.5">
                {invoice.customer.billingAddress}, {invoice.customer.city}, {invoice.customer.country}
              </div>
            )}
            {invoice.customer?.taxNumber && (
              <div className="text-slate-400 print:text-gray-600 mt-1 font-mono">
                Tax ID: {invoice.customer.taxNumber}
              </div>
            )}
          </div>

          {/* Invoice Parameters */}
          <div className="space-y-2 sm:text-right">
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-400 print:text-gray-500">Issue Date:</span>
              <span className="font-semibold text-white print:text-black">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-400 print:text-gray-500">Due Date:</span>
              <span className={`font-semibold ${invoice.isOverdue ? 'text-rose-400' : 'text-white'} print:text-black`}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-400 print:text-gray-500">Billing Period:</span>
              <span className="font-semibold text-slate-300 print:text-gray-700">
                {new Date(invoice.billingPeriodStart).toLocaleDateString()} -{' '}
                {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-400 print:text-gray-500">Payment Terms:</span>
              <span className="font-semibold text-slate-300 print:text-gray-700">
                {invoice.subscription?.paymentTerms || 'Net 30'}
              </span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-400 print:text-gray-500">Subscription #:</span>
              <span className="font-semibold text-indigo-400 print:text-black">
                {invoice.subscription?.subscriptionNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="py-8">
          <table className="w-full text-left text-xs text-slate-300 print:text-gray-800">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-gray-700 print:border-gray-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Item & Description</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                <th className="py-3 px-4 font-semibold text-right">Discount</th>
                <th className="py-3 px-4 font-semibold text-right">Tax Rate</th>
                <th className="py-3 px-4 font-semibold text-right">Tax Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
              {invoice.lines?.map((line) => (
                <tr key={line.id}>
                  <td className="py-3.5 px-4 font-semibold text-white print:text-black">
                    {line.description}
                  </td>
                  <td className="py-3.5 px-4 text-center">{line.quantity}</td>
                  <td className="py-3.5 px-4 text-right">${line.unitPrice.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 print:text-gray-700">
                    {line.discountAmount > 0 ? `-$${line.discountAmount.toFixed(2)}` : '$0.00'}
                  </td>
                  <td className="py-3.5 px-4 text-right">{line.taxRate.toFixed(2)}%</td>
                  <td className="py-3.5 px-4 text-right">${line.taxAmount.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-white print:text-black">
                    ${line.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Calculation Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-6 border-t border-slate-800 print:border-gray-200">
          <div className="text-xs text-slate-400 print:text-gray-500 max-w-sm space-y-2">
            <div className="font-bold text-white uppercase tracking-wider print:text-black">
              Payment Instructions:
            </div>
            <p>
              Please transfer funds citing invoice number <span className="text-indigo-400 font-mono">{invoice.invoiceNumber}</span>.
              Direct questions regarding this invoice to billing@brightloop.io.
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300 print:text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 print:text-gray-700">
                <span>Discount Deduction:</span>
                <span className="font-semibold">-${invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300 print:text-gray-700">
              <span>Tax Total:</span>
              <span className="font-semibold">${invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 print:border-gray-200 flex justify-between text-sm font-extrabold text-white print:text-black">
              <span>Grand Total ({invoice.currency}):</span>
              <span>${invoice.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-600">
              <span>Amount Paid:</span>
              <span className="font-semibold text-emerald-400 print:text-black">
                ${invoice.paidAmount.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 print:border-gray-200 flex justify-between text-sm font-bold">
              <span className="text-slate-200 print:text-black">Balance Due:</span>
              <span className={invoice.balanceDue > 0 ? 'text-amber-400 print:text-black' : 'text-emerald-400'}>
                ${invoice.balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            fetchInvoice();
            setActionSuccess('Payment recorded and allocated successfully');
            setTimeout(() => setActionSuccess(null), 4000);
          }}
          preselectedCustomerId={invoice.customerId}
          preselectedInvoiceId={invoice.id}
          preselectedAmount={invoice.balanceDue}
        />
      )}
    </div>
  );
};
