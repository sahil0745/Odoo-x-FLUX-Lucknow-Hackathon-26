import React, { useEffect, useState } from 'react';
import {
  Percent,
  Tag,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { taxDiscountService } from '../services/taxDiscountService';
import { Tax, Discount, TaxType, DiscountType, DiscountScope } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const TaxesDiscountsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TAXES' | 'DISCOUNTS'>('TAXES');
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Tax form
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('10');
  const [taxType, setTaxType] = useState<TaxType>('PERCENTAGE');
  const [taxIsDefault, setTaxIsDefault] = useState(false);

  // Discount form
  const [discountCode, setDiscountCode] = useState('');
  const [discountDesc, setDiscountDesc] = useState('');
  const [discountValue, setDiscountValue] = useState('15');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountScope, setDiscountScope] = useState<DiscountScope>('SUBSCRIPTION');
  const [minSpend, setMinSpend] = useState('');
  const [maxUsage, setMaxUsage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [taxList, discList] = await Promise.all([
        taxDiscountService.getTaxes(),
        taxDiscountService.getDiscounts(),
      ]);
      setTaxes(taxList);
      setDiscounts(discList);
    } catch (err: any) {
      console.error('Failed to load taxes/discounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await taxDiscountService.createTax({
        name: taxName.trim(),
        rate: parseFloat(taxRate) || 0,
        type: taxType,
        isDefault: taxIsDefault,
      });
      setIsTaxModalOpen(false);
      setTaxName('');
      fetchData();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to create tax');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await taxDiscountService.createDiscount({
        code: discountCode.trim().toUpperCase(),
        description: discountDesc.trim() || undefined,
        value: parseFloat(discountValue) || 0,
        type: discountType,
        scope: discountScope,
        minPurchaseAmount: minSpend ? parseFloat(minSpend) : undefined,
        maxUsageCount: maxUsage ? parseInt(maxUsage) : undefined,
      });
      setIsDiscountModalOpen(false);
      setDiscountCode('');
      setDiscountDesc('');
      fetchData();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to create discount');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Taxes & Discounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure regional VAT/Sales taxes, promotional codes, and cart discount rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'TAXES' ? (
            <Button onClick={() => setIsTaxModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Tax Rule
            </Button>
          ) : (
            <Button onClick={() => setIsDiscountModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Discount Coupon
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('TAXES')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'TAXES'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Percent className="w-4 h-4" /> Tax Rules ({taxes.length})
        </button>
        <button
          onClick={() => setActiveTab('DISCOUNTS')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'DISCOUNTS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" /> Discount Coupons ({discounts.length})
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading configurations...</p>
        </div>
      ) : activeTab === 'TAXES' ? (
        /* Taxes Tab */
        taxes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <Percent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No tax rates defined</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              Add standard VAT, GST, or regional sales tax percentages.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {taxes.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>
                  {t.isDefault && (
                    <Badge variant="info" size="sm">
                      DEFAULT TAX
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  {t.type === 'PERCENTAGE' ? `${Number(t.rate)}%` : `$${Number(t.rate).toFixed(2)}`}
                </div>
                <div className="text-xs text-slate-400 mt-1 capitalize">{t.type.toLowerCase()} rule</div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Discounts Tab */
        discounts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No discount coupons configured</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              Create coupon codes with percentage or fixed dollar deductions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {discounts.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md text-sm border border-slate-200">
                    {d.code}
                  </span>
                  <Badge variant="success" size="sm">
                    {d.scope}
                  </Badge>
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-2">
                  {d.type === 'PERCENTAGE' ? `${Number(d.value)}% OFF` : `$${Number(d.value).toFixed(2)} OFF`}
                </div>
                {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Usage Count:</span>
                    <span className="font-semibold text-slate-800">
                      {d.currentUsageCount} {d.maxUsageCount ? `/ ${d.maxUsageCount}` : 'uses (unlimited)'}
                    </span>
                  </div>
                  {d.minPurchaseAmount && (
                    <div className="flex justify-between">
                      <span>Min Spend:</span>
                      <span className="font-semibold text-slate-800">${Number(d.minPurchaseAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal: Create Tax */}
      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        title="Create Tax Rate Rule"
        description="Configure tax percentage applied to product quotations and invoices."
      >
        <form onSubmit={handleCreateTax} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tax Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Standard VAT (15%)"
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rate Value</label>
              <input
                type="number"
                step="0.01"
                required
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Type</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                <option value="FIXED">FIXED AMOUNT ($)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="taxDefault"
              checked={taxIsDefault}
              onChange={(e) => setTaxIsDefault(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="taxDefault" className="text-xs font-semibold text-slate-700">
              Apply by default to all new quotations
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsTaxModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Tax
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Discount */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Create Discount Coupon"
        description="Establish promotional codes and cart deduction conditions."
      >
        <form onSubmit={handleCreateDiscount} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coupon Code</label>
            <input
              type="text"
              required
              placeholder="e.g. BRIGHTLOOP20"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deduction Value</label>
              <input
                type="number"
                step="0.01"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                <option value="FIXED">FIXED AMOUNT ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Scope</label>
            <select
              value={discountScope}
              onChange={(e) => setDiscountScope(e.target.value as DiscountScope)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SUBSCRIPTION">SUBSCRIPTION</option>
              <option value="PRODUCT">PRODUCT LINE</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Min Spend ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={minSpend}
                onChange={(e) => setMinSpend(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Uses (optional)</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUsage}
                onChange={(e) => setMaxUsage(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Welcome promo for new subscriptions"
              value={discountDesc}
              onChange={(e) => setDiscountDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsDiscountModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Discount
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
