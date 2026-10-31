import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { CreateProductPayload, ProductType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface VariantRow {
  variantType: string;
  variantValue: string;
  additionalPrice: string;
}

export const AddProductPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('SOFTWARE');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Initial variants builder
  const [variants, setVariants] = useState<VariantRow[]>([
    { variantType: 'Brand', variantValue: 'Odoo Enterprise', additionalPrice: '560.00' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { variantType: '', variantValue: '', additionalPrice: '0.00' },
    ]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantRow, value: string) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Live pricing estimation
  const numSalesPrice = parseFloat(salesPrice) || 0;
  const totalVariantsPrice = variants.reduce((sum, v) => sum + (parseFloat(v.additionalPrice) || 0), 0);
  const estimatedFinalPrice = numSalesPrice + totalVariantsPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Product name is required');
      return;
    }
    if (isNaN(numSalesPrice) || numSalesPrice < 0) {
      setErrorMessage('Sales price must be a valid non-negative number');
      return;
    }
    const numCostPrice = parseFloat(costPrice) || 0;
    if (isNaN(numCostPrice) || numCostPrice < 0) {
      setErrorMessage('Cost price must be a valid non-negative number');
      return;
    }

    // Filter valid variants
    const validVariants = variants
      .filter((v) => v.variantType.trim() && v.variantValue.trim())
      .map((v) => ({
        variantType: v.variantType.trim(),
        variantValue: v.variantValue.trim(),
        additionalPrice: parseFloat(v.additionalPrice) || 0,
      }));

    // Check for duplicate variant combos
    const seenCombos = new Set<string>();
    for (const v of validVariants) {
      const key = `${v.variantType.toLowerCase()}:::${v.variantValue.toLowerCase()}`;
      if (seenCombos.has(key)) {
        setErrorMessage(`Duplicate variant detected in form: '${v.variantType}: ${v.variantValue}'`);
        return;
      }
      seenCombos.add(key);
    }

    setIsSubmitting(true);

    try {
      const payload: CreateProductPayload = {
        name: name.trim(),
        type,
        salesPrice: numSalesPrice.toFixed(2),
        costPrice: numCostPrice.toFixed(2),
        notes: notes.trim() || null,
        isActive: true,
        variants: validVariants.length > 0 ? validVariants : undefined,
      };

      const created = await productService.createProduct(payload);
      navigate(`/products/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and page title */}
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Package className="w-7 h-7 text-indigo-600" />
          Create New Product
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Define base catalog pricing, product classification, and optional additive variants.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Validation Error</p>
            <p className="text-rose-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Product Information Card */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Core Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Odoo ERP Platform, Analytics Pro Suite"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="SOFTWARE">Software (Core Recurring Plan)</option>
                <option value="SERVICE">Service (Consulting & Support)</option>
                <option value="ADD_ON">Add-On (Feature Upgrade)</option>
              </select>
            </div>

            {/* Sales Price */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Base Sales Price (USD) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="1000.00"
                  value={salesPrice}
                  onChange={(e) => setSalesPrice(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono font-semibold"
                />
              </div>
            </div>

            {/* Cost Price (Internal Admin) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Cost Price (USD) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-amber-600 font-semibold uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Admin Internal Only
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="450.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
                />
              </div>
            </div>

            {/* Margin Calculation Preview */}
            <div className="flex items-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg w-full">
                <div className="text-xs text-slate-500">Target Profit Margin</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {numSalesPrice > 0 && parseFloat(costPrice) >= 0 ? (
                    <>
                      ${(numSalesPrice - (parseFloat(costPrice) || 0)).toFixed(2)}{' '}
                      <span className="text-xs text-emerald-600 font-normal">
                        ({(((numSalesPrice - (parseFloat(costPrice) || 0)) / numSalesPrice) * 100).toFixed(1)}%)
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">Enter prices to preview</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Internal Notes & Description
              </label>
              <textarea
                rows={3}
                placeholder="Operational notes, implementation instructions, or vendor references..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                Visible to Admin and Internal Staff. Hidden from customer accounts.
              </p>
            </div>
          </div>
        </Card>

        {/* Initial Variants Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Additive Product Variants & Upgrades
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Variants add configurable surcharges to the base sales price (e.g., Odoo Brand +$560.00).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddVariantRow}
              className="flex items-center gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Variant</span>
            </Button>
          </div>

          {variants.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No initial variants added</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariantRow}
                className="mt-3 text-xs"
              >
                Add First Variant
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs font-bold uppercase tracking-wider text-slate-500 px-1 hidden sm:grid">
                <div className="col-span-4">Variant Type</div>
                <div className="col-span-5">Variant Value / Name</div>
                <div className="col-span-2">Additive Price</div>
                <div className="col-span-1 text-right">Remove</div>
              </div>

              {variants.map((v, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 bg-slate-50/75 border border-slate-200 rounded-lg items-center"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="e.g. Brand, Edition"
                      value={v.variantType}
                      onChange={(e) => handleVariantChange(index, 'variantType', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="e.g. Odoo Enterprise, Pro 5-User"
                      value={v.variantValue}
                      onChange={(e) => handleVariantChange(index, 'variantValue', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2 relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="560.00"
                      value={v.additionalPrice}
                      onChange={(e) => handleVariantChange(index, 'additionalPrice', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded font-mono font-semibold focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariantRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Calculation Summary Box */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                Live Pricing Breakdown
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Base price (${numSalesPrice.toFixed(2)}) + all variants (${totalVariantsPrice.toFixed(2)})
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Combined Surcharge</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                ${estimatedFinalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="px-6"
          >
            Save & Publish Product
          </Button>
        </div>
      </form>
    </div>
  );
};
