import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { Product, ProductType, CreateProductPayload, CreateVariantPayload } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState<CreateProductPayload>({
    name: '',
    type: 'SOFTWARE',
    salesPrice: 0,
    costPrice: 0,
    notes: '',
  });

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<CreateVariantPayload>({
    variantType: 'Brand',
    variantValue: '',
    additionalPrice: 0,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.listProducts({
        search: search || undefined,
        type: typeFilter !== 'ALL' ? (typeFilter as ProductType) : undefined,
      });
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const toggleExpand = (id: string) => {
    setExpandedProductIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await productService.createProduct(productForm);
      setSuccessMessage('Product created successfully!');
      setShowProductModal(false);
      setProductForm({ name: '', type: 'SOFTWARE', salesPrice: 0, costPrice: 0, notes: '' });
      fetchProducts();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create product');
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    try {
      setError(null);
      await productService.createVariant(selectedProductId, variantForm);
      setSuccessMessage('Variant added successfully!');
      setShowVariantModal(false);
      setVariantForm({ variantType: 'Brand', variantValue: '', additionalPrice: 0 });
      fetchProducts();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to add variant');
    }
  };

  const handleDeleteVariant = async (productId: string, variantId: string) => {
    if (!window.confirm('Are you sure you want to remove this variant?')) return;
    try {
      await productService.deleteVariant(productId, variantId);
      setSuccessMessage('Variant removed successfully!');
      fetchProducts();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove variant');
    }
  };

  const getTypeBadgeVariant = (type: ProductType): 'info' | 'success' | 'warning' | 'neutral' => {
    switch (type) {
      case 'SOFTWARE':
        return 'info';
      case 'SERVICE':
        return 'success';
      case 'ADD_ON':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Products & Additive Variants
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage software catalog, standalone services, and additive variant surcharges (e.g. Brand = Odoo).
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setShowProductModal(true)}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </Button>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['ALL', 'SOFTWARE', 'SERVICE', 'ADD_ON'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {type === 'ALL' ? 'All Products' : type}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner className="w-8 h-8 text-indigo-400" />
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-16 bg-slate-900/40 border-slate-800">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-200">No products found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'Try adjusting your search criteria.' : 'Create your first product to build quotations and subscriptions.'}
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowProductModal(true)}
              className="mt-4 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => {
            const isExpanded = !!expandedProductIds[product.id];
            const variantCount = product.variants?.length || 0;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {product.name}
                      </h3>
                      <Badge variant={getTypeBadgeVariant(product.type)}>
                        {product.type}
                      </Badge>
                      {!product.isActive && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Inactive
                        </span>
                      )}
                    </div>
                    {product.notes && (
                      <p className="text-xs text-slate-400 line-clamp-1">{product.notes}</p>
                    )}
                  </div>

                  {/* Financial Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        Sales Price
                      </div>
                      <div className="font-bold text-slate-100 text-base">
                        ${Number(product.salesPrice).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        Cost Price
                      </div>
                      <div className="text-slate-300">
                        ${Number(product.costPrice ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> Margin
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        {product.marginPercent}%
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    <button
                      onClick={() => toggleExpand(product.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{variantCount} Variants</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setShowVariantModal(true);
                        }}
                        className="text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Variant</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Variants Section */}
                {isExpanded && (
                  <div className="bg-slate-950/70 border-t border-slate-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Additive Pricing Variants</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Effective Price = Base (${Number(product.salesPrice).toFixed(2)}) + Additive Surcharge
                      </span>
                    </div>

                    {variantCount === 0 ? (
                      <p className="text-xs text-slate-500 py-3 italic">
                        No additive variants registered yet. Base product price applies unconditionally.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {product.variants?.map((v) => (
                          <div
                            key={v.id}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
                                {v.variantType}
                              </div>
                              <div className="text-sm font-bold text-white mt-0.5">
                                {v.variantValue}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                <span className="text-emerald-400 font-medium">
                                  +${Number(v.additionalPrice).toFixed(2)}
                                </span>
                                <span className="text-slate-600">→</span>
                                <span className="text-slate-200 font-bold">
                                  ${Number(v.effectivePrice ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteVariant(product.id, v.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                                title="Remove Variant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create New Product</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Brightloop ERP Core"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Type *
                </label>
                <select
                  value={productForm.type}
                  onChange={(e) =>
                    setProductForm({ ...productForm, type: e.target.value as ProductType })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="SOFTWARE">SOFTWARE (Recurring License/Seat)</option>
                  <option value="SERVICE">SERVICE (Managed or SLA support)</option>
                  <option value="ADD_ON">ADD_ON (Module / Storage add-on)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sales Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.salesPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, salesPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cost Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.costPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={productForm.notes || ''}
                  onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                  placeholder="Optional details, target customer tier, SLA notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="ghost" type="button" onClick={() => setShowProductModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Variant */}
      {showVariantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add Additive Variant</h3>
              <button
                onClick={() => setShowVariantModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Variant Type *
                </label>
                <input
                  type="text"
                  required
                  value={variantForm.variantType}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, variantType: e.target.value })
                  }
                  placeholder="e.g. Brand, Edition, Tier"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Variant Value *
                </label>
                <input
                  type="text"
                  required
                  value={variantForm.variantValue}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, variantValue: e.target.value })
                  }
                  placeholder="e.g. Odoo, Enterprise, Pro"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Additive Surcharge ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={variantForm.additionalPrice}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      additionalPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g. 560.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Amount added on top of the base sales price when selected.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="ghost" type="button" onClick={() => setShowVariantModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
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
