import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { quotationService } from '../services/quotationService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { planService } from '../services/planService';
import { Quotation, Product, CustomerProfile, Plan, QuotationStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);

  // Create Quote Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [lineItems, setLineItems] = useState<
    Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }>
  >([{ productId: '', variantId: '', quantity: 1, unitPrice: 0 }]);

  // Convert Quote Form State
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [quotesRes, prodsRes, plansRes] = await Promise.all([
        quotationService.getQuotations(),
        productService.getProducts(),
        planService.getPlans(),
      ]);
      setQuotations(quotesRes);
      setProducts(prodsRes);
      setPlans(plansRes);

      if (isAdminOrStaff) {
        const custsRes = await customerService.getCustomers();
        setCustomers(custsRes);
      }
    } catch (err: any) {
      console.error('Failed to load quotation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...lineItems];
    updated[index].productId = productId;
    updated[index].variantId = '';
    updated[index].unitPrice = prod ? Number(prod.salesPrice) : 0;
    setLineItems(updated);
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const updated = [...lineItems];
    updated[index].variantId = variantId;
    const prod = products.find((p) => p.id === updated[index].productId);
    const basePrice = prod ? Number(prod.salesPrice) : 0;
    const variant = prod?.variants?.find((v) => v.id === variantId);
    const addPrice = variant ? Number(variant.variantPrice) : 0;
    updated[index].unitPrice = basePrice + addPrice;
    setLineItems(updated);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { productId: '', variantId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const validLines = lineItems.filter((l) => l.productId);
    if (validLines.length === 0) {
      setActionError('Please add at least one product to the quotation');
      return;
    }

    const customerId = isAdminOrStaff ? selectedCustomerId : user?.customerProfile?.id;
    if (!customerId) {
      setActionError('Customer is required');
      return;
    }

    setSubmitting(true);
    try {
      await quotationService.createQuotation({
        customerId,
        notes: notes.trim() || undefined,
        validUntil: validUntil || undefined,
        items: validLines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });
      setIsCreateOpen(false);
      setLineItems([{ productId: '', variantId: '', quantity: 1, unitPrice: 0 }]);
      setNotes('');
      fetchData();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await quotationService.acceptQuotation(id);
      fetchData();
      if (selectedQuote?.id === id) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to accept quotation');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter rejection reason (optional):');
    try {
      await quotationService.rejectQuotation(id, reason || undefined);
      fetchData();
      if (selectedQuote?.id === id) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reject quotation');
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !selectedPlanId) return;
    setSubmitting(true);
    try {
      await quotationService.convertToSubscription(selectedQuote.id, {
        planId: selectedPlanId,
      });
      setIsConvertOpen(false);
      setIsDetailOpen(false);
      fetchData();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to convert quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="success">ACCEPTED</Badge>;
      case 'CONVERTED':
        return <Badge variant="info">CONVERTED TO SUB</Badge>;
      case 'SENT':
        return <Badge variant="warning">SENT (PENDING)</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">DRAFT</Badge>;
      case 'EXPIRED':
      case 'CANCELLED':
        return <Badge variant="danger">{status}</Badge>;
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    if (selectedStatus === 'ALL') return true;
    return q.status === selectedStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations & Proposals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create multi-item pricing quotes, customer approvals, and convert directly to subscriptions.
          </p>
        </div>
        {isAdminOrStaff && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Quotation
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED', 'CANCELLED'].map((st) => (
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

      {/* Quotation Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading quotations...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No quotations found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {selectedStatus !== 'ALL'
              ? `No quotations with status "${selectedStatus}".`
              : 'Create a quotation to propose software plans and services to your customers.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Quote Number</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Subtotal</th>
                  <th className="py-3.5 px-6 text-right">Grand Total</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>{q.quotationNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                        Created {new Date(q.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800">
                        {q.customer?.companyName || q.customer?.contactName || 'Customer'}
                      </div>
                      <div className="text-xs text-slate-400">{q.customer?.user?.email}</div>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(q.status)}</td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      ${Number(q.subtotal).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900 text-base">
                      ${Number(q.grandTotal ?? q.totalAmount ?? 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(q);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>

                        {q.status === 'SENT' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAccept(q.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleReject(q.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {q.status === 'ACCEPTED' && isAdminOrStaff && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              setSelectedQuote(q);
                              setIsConvertOpen(true);
                            }}
                          >
                            Convert to Sub
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Quotation */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Quotation"
        description="Draft a formal quotation with products, variants, and quantities."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
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
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.contactName})` : c.contactName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Line Items Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase">Quotation Items</label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>

            {lineItems.map((item, idx) => {
              const selectedProd = products.find((p) => p.id === item.productId);
              return (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product</label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Choose product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${Number(p.salesPrice).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Variant</label>
                      <select
                        value={item.variantId}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        disabled={!selectedProd || !selectedProd.variants?.length}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Base / Standard</option>
                        {selectedProd?.variants?.map((v) => {
                          const vName = v.name || `${v.variantType ? v.variantType + ' - ' : ''}${v.variantValue || 'Option'}`;
                          const vPrice = Number(v.additionalPrice ?? v.variantPrice ?? 0);
                          return (
                            <option key={v.id} value={v.id}>
                              {vName} (+${vPrice.toFixed(2)})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setLineItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">Total</div>
                        <div className="text-xs font-bold text-slate-800">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </div>
                      </div>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valid Until (optional)</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Terms</label>
              <input
                type="text"
                placeholder="e.g. Valid for 30 calendar days."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Generate Quotation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quotation Detail */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Quotation: ${selectedQuote?.quotationNumber || ''}`}
        description="Detailed review of quotation breakdown and item snapshots."
        maxWidth="xl"
      >
        {selectedQuote && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <div className="text-xs text-slate-500">Customer</div>
                <div className="font-semibold text-slate-900">
                  {selectedQuote.customer?.companyName || selectedQuote.customer?.contactName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Status</div>
                <div>{getStatusBadge(selectedQuote.status)}</div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Quotation Line Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedQuote.lines || selectedQuote.items || []).map((it) => {
                      const vName = it.variant
                        ? it.variant.name ||
                          `${it.variant.variantType ? it.variant.variantType + ' - ' : ''}${it.variant.variantValue || 'Variant'}`
                        : null;
                      return (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {it.product?.name || 'Product'}
                            {vName && (
                              <span className="text-[11px] text-indigo-600 ml-1">({vName})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right">${Number(it.unitPrice).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold">${Number(it.lineTotal).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">${Number(selectedQuote.subtotal).toFixed(2)}</span>
              </div>
              {Number(selectedQuote.discountTotal ?? selectedQuote.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-${Number(selectedQuote.discountTotal ?? selectedQuote.discountAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              {Number(selectedQuote.taxTotal ?? selectedQuote.taxAmount ?? 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span>+${Number(selectedQuote.taxTotal ?? selectedQuote.taxAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>${Number(selectedQuote.grandTotal ?? selectedQuote.totalAmount ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
              {selectedQuote.status === 'ACCEPTED' && isAdminOrStaff && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setIsConvertOpen(true)}
                >
                  Convert to Subscription
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Convert to Subscription */}
      <Modal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title="Convert Quotation to Subscription"
        description="Select the subscription plan cadence to activate recurring billing for this quote."
      >
        <form onSubmit={handleConvert} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Subscription Plan Cadence
            </label>
            <select
              required
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billingFrequency})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Converting this quotation will atomically generate an active subscription record and
            schedule the first invoice generation period.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsConvertOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Convert Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
