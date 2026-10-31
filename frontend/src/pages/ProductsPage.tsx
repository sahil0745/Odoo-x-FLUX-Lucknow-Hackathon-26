import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/productService';
import { Product, ProductType } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [targetProductForVariant, setTargetProductForVariant] = useState<Product | null>(null);

  // Form states - Product
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productType, setProductType] = useState<ProductType>('SOFTWARE');
  const [salesPrice, setSalesPrice] = useState<string>('99.00');
  const [costPrice, setCostPrice] = useState<string>('20.00');

  // Form states - Variant
  const [variantName, setVariantName] = useState('');
  const [variantDescription, setVariantDescription] = useState('');
  const [variantPrice, setVariantPrice] = useState<string>('25.00');
  const [variantSku, setVariantSku] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const list = await productService.getProducts();
      setProducts(list);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedProductIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedProductIds(next);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await productService.createProduct({
        name: productName.trim(),
        description: productDescription.trim() || undefined,
        notes: productDescription.trim() || undefined,
        type: productType,
        salesPrice: parseFloat(salesPrice) || 0,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
      });
      setIsCreateProductOpen(false);
      setProductName('');
      setProductDescription('');
      fetchProducts();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForVariant) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await productService.createVariant(targetProductForVariant.id, {
        variantType: 'Tier',
        variantValue: variantName.trim(),
        name: variantName.trim(),
        description: variantDescription.trim() || undefined,
        variantPrice: parseFloat(variantPrice) || 0,
        additionalPrice: parseFloat(variantPrice) || 0,
        sku: variantSku.trim() || undefined,
      });
      setIsAddVariantOpen(false);
      setVariantName('');
      setVariantDescription('');
      setVariantSku('');
      fetchProducts();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to add variant');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || p.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Services Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage software solutions, service packages, add-ons, and pricing variants.
          </p>
        </div>
        {isAdminOrStaff && (
          <Button onClick={() => setIsCreateProductOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Product
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {['ALL', 'SOFTWARE', 'SERVICE', 'ADD_ON'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  selectedType === type
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading catalog items...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No products found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || selectedType !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : 'Start by creating your first product or service package.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => {
            const isExpanded = expandedProductIds.has(product.id);
            const variantCount = product.variants?.length || 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-all"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleExpand(product.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 mt-0.5 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-slate-900 text-base">{product.name}</h3>
                        <Badge
                          variant={
                            product.type === 'SOFTWARE'
                              ? 'info'
                              : product.type === 'SERVICE'
                              ? 'success'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {product.type}
                        </Badge>
                        {product.isActive ? (
                          <span className="inline-flex items-center text-xs text-emerald-600 font-medium gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-400 gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {product.notes || product.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Base Price</div>
                      <div className="text-lg font-bold text-slate-900">
                        ${Number(product.salesPrice).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdminOrStaff && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTargetProductForVariant(product);
                            setIsAddVariantOpen(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Variant
                        </Button>
                      )}
                      <button
                        onClick={() => toggleExpand(product.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                      >
                        {variantCount} {variantCount === 1 ? 'Variant' : 'Variants'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Variants Drawer */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-100 p-5 pl-14 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Product Variants & Add-on Tiers
                    </h4>
                    {variantCount === 0 ? (
                      <p className="text-xs text-slate-400 italic">No variants configured for this product yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {product.variants?.map((v) => {
                          const vName =
                            v.name ||
                            `${(v as any).variantType ? (v as any).variantType + ' - ' : ''}${
                              (v as any).variantValue || 'Option'
                            }`;
                          const vPrice = Number((v as any).additionalPrice ?? v.variantPrice ?? 0);
                          return (
                            <div
                              key={v.id}
                              className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex items-center justify-between"
                            >
                              <div>
                                <div className="font-semibold text-xs text-slate-800">{vName}</div>
                                {v.sku && <div className="text-[11px] text-slate-400">SKU: {v.sku}</div>}
                                {v.description && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">{v.description}</div>
                                )}
                              </div>
                              <div className="text-right pl-3">
                                <span className="text-xs font-bold text-indigo-600">
                                  +${vPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
      <Modal
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        title="Create New Product or Service"
        description="Add a billable item to your SaaS product catalog."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Brightloop Enterprise Cloud"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Type</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SOFTWARE">SOFTWARE (SaaS License / Platform)</option>
              <option value="SERVICE">SERVICE (Managed Support / Consulting)</option>
              <option value="ADD_ON">ADD_ON (Extra Storage / API Quota)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sales Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cost Price ($ optional)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Detailed capabilities, SLA terms, or inclusions..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Variant */}
      <Modal
        isOpen={isAddVariantOpen}
        onClose={() => setIsAddVariantOpen(false)}
        title={`Add Variant to ${targetProductForVariant?.name || 'Product'}`}
        description="Configure tier sizes or capacity options with additional price adjustments."
      >
        <form onSubmit={handleAddVariant} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Variant Name</label>
            <input
              type="text"
              required
              placeholder="e.g. 500 GB Storage Tier"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Variant Add-on Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={variantPrice}
                onChange={(e) => setVariantPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SKU (optional)</label>
              <input
                type="text"
                placeholder="SKU-STORAGE-500"
                value={variantSku}
                onChange={(e) => setVariantSku(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Description</label>
            <input
              type="text"
              placeholder="e.g. Includes automated snapshot backup"
              value={variantDescription}
              onChange={(e) => setVariantDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddVariantOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Add Variant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
