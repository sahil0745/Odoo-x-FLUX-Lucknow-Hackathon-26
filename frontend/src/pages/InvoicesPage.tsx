import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { invoiceService } from '../services/invoiceService';
import { Invoice, InvoiceStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const list = await invoiceService.getInvoices();
      setInvoices(list);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      await invoiceService.confirmInvoice(id);
      fetchInvoices();
      if (selectedInvoice?.id === id) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to confirm invoice');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Cancellation reason:');
    try {
      await invoiceService.cancelInvoice(id, reason || undefined);
      fetchInvoices();
      if (selectedInvoice?.id === id) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  const handleDownloadPdf = async (id: string, invoiceNum: string) => {
    setDownloadingId(id);
    try {
      const blob = await invoiceService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to download PDF invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">PAID</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info">CONFIRMED (DUE)</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">DRAFT</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (selectedStatus === 'ALL') return true;
    return inv.status === selectedStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track subscription cycle invoices, payment confirmations, and automated billing records.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInvoices}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'CONFIRMED', 'PAID', 'DRAFT', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStatus === st
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No invoices found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {selectedStatus !== 'ALL'
              ? `No invoices matching status "${selectedStatus}".`
              : 'Invoices will automatically generate when subscription billing cycles trigger.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Invoice #</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6 text-right">Grand Total</th>
                  <th className="py-3.5 px-6 text-right">Balance Due</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const isOverdue =
                    inv.status !== 'PAID' &&
                    inv.status !== 'CANCELLED' &&
                    new Date(inv.dueDate) < new Date();

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>{inv.invoiceNumber}</span>
                        </div>
                        {inv.subscription && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            Sub: {inv.subscription.subscriptionNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800">
                          {inv.customer?.companyName || inv.customer?.contactName || 'Customer'}
                        </div>
                        <div className="text-xs text-slate-400">{inv.customer?.user?.email}</div>
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(inv.status)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(inv.dueDate).toLocaleDateString()}</span>
                        </div>
                        {isOverdue && (
                          <span className="text-[11px] text-rose-500 font-bold flex items-center gap-0.5 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                        ${Number(inv.grandTotal ?? inv.totalAmount ?? 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-right font-bold">
                        {Number(inv.balanceDue) > 0 ? (
                          <span className="text-rose-600">${Number(inv.balanceDue).toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-600">$0.00</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={downloadingId === inv.id}
                            onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 text-indigo-600" />
                          </Button>

                          {inv.status === 'DRAFT' && isAdminOrStaff && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-indigo-600"
                              onClick={() => handleConfirm(inv.id)}
                            >
                              Confirm
                            </Button>
                          )}

                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && isAdminOrStaff && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleCancel(inv.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Invoice Detail */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Invoice: ${selectedInvoice?.invoiceNumber || ''}`}
        description="Line-item breakdown, tax allocations, and outstanding balance."
        maxWidth="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {selectedInvoice.customer?.companyName || selectedInvoice.customer?.contactName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Period:</span>
                <span className="text-slate-700">
                  {selectedInvoice.billingPeriodStart
                    ? `${new Date(selectedInvoice.billingPeriodStart).toLocaleDateString()} to ${new Date(
                        selectedInvoice.billingPeriodEnd || ''
                      ).toLocaleDateString()}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Date:</span>
                <span className="text-slate-700">{new Date(selectedInvoice.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-semibold text-rose-600">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Invoice Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedInvoice.lines || selectedInvoice.items || []).map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{it.description}</td>
                        <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right">${Number(it.unitPrice).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold">${Number(it.lineTotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">${Number(selectedInvoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(selectedInvoice.taxTotal ?? selectedInvoice.taxAmount ?? 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax Total:</span>
                  <span>+${Number(selectedInvoice.taxTotal ?? selectedInvoice.taxAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              {Number(selectedInvoice.discountTotal ?? selectedInvoice.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-${Number(selectedInvoice.discountTotal ?? selectedInvoice.discountAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>${Number(selectedInvoice.grandTotal ?? selectedInvoice.totalAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold text-sm">
                <span>Balance Due:</span>
                <span>${Number(selectedInvoice.balanceDue).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoiceNumber)}
              >
                <Download className="w-4 h-4 mr-1.5" /> Download PDF
              </Button>
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
