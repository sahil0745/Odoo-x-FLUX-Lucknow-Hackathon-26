import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { Product, ProductType, UpdateProductPayload } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('SOFTWARE');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick variant add state
  const [newVarType, setNewVarType] = useState('Configuration');
  const [newVarValue, setNewVarValue] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('300.00');
  const [isAddingVar, setIsAddingVar] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await productService.getProductById(id);
        setProduct(data);
        setName(data.name);
        setType(data.type);
        setSalesPrice(data.salesPrice);
        setCostPrice(data.costPrice || '0.00');
        setNotes(data.notes || '');
        setIsActive(data.isActive);
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || err.message || 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const numSalesPrice = parseFloat(salesPrice);
    if (isNaN(numSalesPrice) || numSalesPrice < 0) {
      setErrorMessage('Sales price must be a valid non-negative number');
      return;
    }
    const numCostPrice = parseFloat(costPrice);
    if (isNaN(numCostPrice) || numCostPrice < 0) {
      setErrorMessage('Cost price must be a valid non-negative number');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateProductPayload = {
        name: name.trim(),
        type,
        salesPrice: numSalesPrice.toFixed(2),
        costPrice: numCostPrice.toFixed(2),
        notes: notes.trim() || null,
        isActive,
      };

      await productService.updateProduct(id, payload);
      setSuccessMessage('Product updated successfully! Historical snapshots remain preserved.');
      setTimeout(() => navigate(`/products/${id}`), 1200);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newVarValue.trim()) return;

    setIsAddingVar(true);
    setErrorMessage(null);
    try {
      await productService.createVariant(id, {
        variantType: newVarType.trim(),
        variantValue: newVarValue.trim(),
        additionalPrice: parseFloat(newVarPrice) || 0,
      });
      setSuccessMessage(`Variant '${newVarType}: ${newVarValue}' added`);
      setNewVarValue('');
      // refresh product
      const updated = await productService.getProductById(id);
      setProduct(updated);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to add variant');
    } finally {
      setIsAddingVar(false);
    }
  };

  const handleDeleteVariant = async (variantId: string, label: string) => {
    if (!id) return;
    if (!window.confirm(`Delete variant '${label}'?`)) return;

    try {
      await productService.deleteVariant(id, variantId);
      setSuccessMessage(`Variant '${label}' removed`);
      const updated = await productService.getProductById(id);
      setProduct(updated);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Cannot delete variant');
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <Spinner className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
        <p className="text-sm font-medium">Loading product for editing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          to={`/products/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Product Details</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Package className="w-7 h-7 text-indigo-600" />
          Edit Product: {product?.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Modify catalog properties. Changes will apply to new quotes and contracts without
          mutating existing historical snapshots.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="text-rose-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Product Attributes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="SOFTWARE">Software</option>
                <option value="SERVICE">Service</option>
                <option value="ADD_ON">Add-On</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Catalog Sales Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={salesPrice}
                  onChange={(e) => setSalesPrice(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Cost Price (USD)</span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Admin Only
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Product Publication Status
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>Active (Available for sales)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span>Deactivated (Hidden from catalog)</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Internal Description & Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/products/${id}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Save Product Changes
            </Button>
          </div>
        </Card>
      </form>

      {/* Variant Management Section */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Configured Product Variants ({product?.variants?.length || 0})
          </span>
        </h2>

        {/* Existing variants list */}
        {product?.variants && product.variants.length > 0 ? (
          <div className="divide-y divide-slate-100 mb-6">
            {product.variants.map((v) => (
              <div key={v.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600 mr-2">
                    {v.variantType}
                  </span>
                  <span className="font-semibold text-slate-900">{v.variantValue}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    +${parseFloat(v.additionalPrice).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVariant(v.id, `${v.variantType}: ${v.variantValue}`)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Delete variant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No variants added yet.</p>
        )}

        {/* Add new variant form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            Add New Variant
          </h3>
          <form onSubmit={handleAddVariant} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Variant Type</label>
              <input
                type="text"
                required
                placeholder="e.g. Configuration, Edition"
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Variant Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise, Option A"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Price (+USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newVarPrice}
                onChange={(e) => setNewVarPrice(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded font-mono"
              />
            </div>
            <div className="sm:col-span-1">
              <Button type="submit" variant="primary" size="sm" isLoading={isAddingVar} className="w-full text-xs">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
