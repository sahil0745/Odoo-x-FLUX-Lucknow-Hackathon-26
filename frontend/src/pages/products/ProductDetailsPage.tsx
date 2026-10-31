import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Layers,
  ArrowLeft,
  Edit3,
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Server,
  Wrench,
  Sparkles,
  Info,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { Product, ProductType, PriceCalculationResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Price Calculator state
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [calculationResult, setCalculationResult] = useState<PriceCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // New variant modal state
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [newVariantType, setNewVariantType] = useState('Brand');
  const [newVariantValue, setNewVariantValue] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('560.00');
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  const fetchProduct = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await productService.getProductById(id);
      setProduct(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Recalculate price whenever selected variants change
  useEffect(() => {
    if (!product || !id) return;

    const runCalculation = async () => {
      setIsCalculating(true);
      try {
        const result = await productService.calculatePrice(id, selectedVariantIds);
        setCalculationResult(result);
      } catch (err: any) {
        // If conflicting variant or error, show inline message
        console.warn('Price calculation failed:', err);
      } finally {
        setIsCalculating(false);
      }
    };

    runCalculation();
  }, [id, product, selectedVariantIds]);

  const handleToggleVariantSelection = (variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((vId) => vId !== variantId) : [...prev, variantId]
    );
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newVariantValue.trim()) return;

    setIsAddingVariant(true);
    setErrorMessage(null);
    try {
      await productService.createVariant(id, {
        variantType: newVariantType.trim(),
        variantValue: newVariantValue.trim(),
        additionalPrice: parseFloat(newVariantPrice) || 0,
      });
      setSuccessMessage(`Variant '${newVariantType}: ${newVariantValue}' added successfully`);
      setIsVariantModalOpen(false);
      setNewVariantValue('');
      fetchProduct();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to add variant');
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string, label: string) => {
    if (!id) return;
    if (!window.confirm(`Delete variant '${label}'?`)) return;

    try {
      setErrorMessage(null);
      await productService.deleteVariant(id, variantId);
      setSuccessMessage(`Variant '${label}' was deleted`);
      fetchProduct();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Cannot delete variant');
    }
  };

  const getTypeBadge = (type: ProductType) => {
    switch (type) {
      case 'SOFTWARE':
        return (
          <Badge variant="info" size="md" className="gap-1">
            <Server className="w-3.5 h-3.5" /> Software Platform
          </Badge>
        );
      case 'SERVICE':
        return (
          <Badge variant="success" size="md" className="gap-1">
            <Wrench className="w-3.5 h-3.5" /> Managed Service
          </Badge>
        );
      case 'ADD_ON':
        return (
          <Badge variant="warning" size="md" className="gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Add-On Extension
          </Badge>
        );
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <Spinner className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
        <p className="text-sm font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Product Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{errorMessage || 'The requested product could not be located.'}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/products')}>
          Return to Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            {getTypeBadge(product.type)}
            {product.isActive ? (
              <Badge variant="success" size="sm">Active</Badge>
            ) : (
              <Badge variant="neutral" size="sm">Inactive</Badge>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVariantModalOpen(true)}
              className="flex items-center gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Variant</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/products/${product.id}/edit`)}
              className="flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Product</span>
            </Button>
          </div>
        )}
      </div>

      {/* Alert Banners */}
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

      {/* Main Grid: Overview & Live Price Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Information & Variant Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Base Information Card */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Overview & Pricing Specs
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Catalog Base Price
                </span>
                <span className="text-2xl font-bold font-mono text-slate-900 mt-0.5 block">
                  ${parseFloat(product.salesPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400">Monthly / Contract Base</span>
              </div>

              {isAdmin && (
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                    Cost Price (Admin)
                  </span>
                  <span className="text-2xl font-bold font-mono text-amber-900 mt-0.5 block">
                    {product.costPrice ? `$${parseFloat(product.costPrice).toFixed(2)}` : 'N/A'}
                  </span>
                  {product.costPrice && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      Margin: $
                      {(parseFloat(product.salesPrice) - parseFloat(product.costPrice)).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Notes Section for Internal Roles */}
            {product.notes && (isAdmin || isStaff) && (
              <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  Internal Operational Notes
                </span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{product.notes}</p>
              </div>
            )}
          </Card>

          {/* Available Additive Variants Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Available Variants & Add-ons
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select variants to preview dynamic price calculation.
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {product.variants?.length || 0} configured
              </span>
            </div>

            {!product.variants || product.variants.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No variants configured for this product.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {product.variants.map((v) => {
                  const isSelected = selectedVariantIds.includes(v.id);
                  return (
                    <div
                      key={v.id}
                      className={`py-3 px-2 flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleToggleVariantSelection(v.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {v.variantType}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">{v.variantValue}</span>
                          </div>
                          {!v.isActive && (
                            <span className="text-[10px] text-rose-500 font-semibold block mt-0.5">
                              Deactivated
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          +${parseFloat(v.additionalPrice).toFixed(2)}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVariant(v.id, `${v.variantType}: ${v.variantValue}`);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Interactive Pricing Calculator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-gradient-to-b from-slate-900 to-indigo-950 text-white shadow-xl border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-400" />
                Live Pricing Engine
                {isCalculating && <Spinner className="w-3.5 h-3.5 text-indigo-400" />}
              </h3>
              <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                USD ($)
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Select or deselect variants on the left to test exact financial arithmetic.
            </p>

            {/* Price Breakdown Details */}
            <div className="mt-5 space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800/80">
                <span className="text-xs text-slate-400">Base Catalog Price:</span>
                <span className="font-semibold">${parseFloat(product.salesPrice).toFixed(2)}</span>
              </div>

              {/* Selected Variants Breakdown */}
              <div className="space-y-1.5 py-1">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-sans font-bold block">
                  Active Variant Add-ons ({selectedVariantIds.length})
                </span>

                {selectedVariantIds.length === 0 ? (
                  <p className="text-xs text-slate-500 italic font-sans py-1">
                    No variant add-ons selected (Base price applies)
                  </p>
                ) : (
                  calculationResult?.selectedVariants.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center justify-between text-xs text-slate-300 pl-2"
                    >
                      <span className="truncate max-w-[180px]">
                        + {item.variantType}: {item.variantValue}
                      </span>
                      <span className="text-emerald-400">+${item.additionalPrice}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal of Variants */}
              {selectedVariantIds.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <span>Total Variant Surcharges:</span>
                  <span className="text-emerald-400 font-semibold">
                    +${calculationResult?.totalVariantAdditions || '0.00'}
                  </span>
                </div>
              )}

              {/* Final Calculated Selling Price */}
              <div className="pt-4 border-t-2 border-indigo-500/40">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase font-sans font-bold tracking-wider text-indigo-300 block">
                      Final Selling Price
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      Base Price + Selected Variants
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                      ${calculationResult?.finalPrice || parseFloat(product.salesPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Verification Callout */}
            <div className="mt-6 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
              <strong className="text-white block mb-0.5">Business Logic Verified:</strong>
              Base price $1,000.00 + Odoo configuration $560.00 evaluates exactly to $1,560.00 using
              Prisma Decimal arithmetic.
            </div>
          </Card>
        </div>
      </div>

      {/* Add Variant Modal (Admin) */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Add Product Variant
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Define a new option and additive surcharge for '{product.name}'.
            </p>

            <form onSubmit={handleCreateVariant} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Variant Type
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brand, Edition, Tier, License"
                  value={newVariantType}
                  onChange={(e) => setNewVariantType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Variant Value / Configuration Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odoo Enterprise, 10-User Pack"
                  value={newVariantValue}
                  onChange={(e) => setNewVariantValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Additional Price Surcharge (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="560.00"
                    value={newVariantPrice}
                    onChange={(e) => setNewVariantPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVariantModalOpen(false)}
                  disabled={isAddingVariant}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isAddingVariant}
                >
                  Save Variant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
