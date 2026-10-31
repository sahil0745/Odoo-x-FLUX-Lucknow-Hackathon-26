import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Power,
  Trash2,
  Layers,
  Sparkles,
  Server,
  Wrench,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { Product, ProductType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export const ProductListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params: any = {
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
        type: selectedType || undefined,
        isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
      };

      const res = await productService.getProducts(params);
      setProducts(res.data || []);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedType, selectedStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleStatus = async (product: Product) => {
    try {
      setErrorMessage(null);
      await productService.updateProductStatus(product.id, !product.isActive);
      setSuccessMessage(
        `Product '${product.name}' was successfully ${!product.isActive ? 'activated' : 'deactivated'}`
      );
      fetchProducts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update product status');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await productService.deleteProduct(productToDelete.id);
      setSuccessMessage(res.message);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Cannot delete product referenced by financial transactions'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeBadge = (type: ProductType) => {
    switch (type) {
      case 'SOFTWARE':
        return (
          <Badge variant="info" size="sm" className="gap-1 font-medium">
            <Server className="w-3 h-3" /> Software
          </Badge>
        );
      case 'SERVICE':
        return (
          <Badge variant="success" size="sm" className="gap-1 font-medium">
            <Wrench className="w-3 h-3" /> Service
          </Badge>
        );
      case 'ADD_ON':
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-medium">
            <Sparkles className="w-3 h-3" /> Add-On
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>;
    }
  };

  // Dashboard calculations from current data
  const activeCount = products.filter((p) => p.isActive).length;
  const softwareCount = products.filter((p) => p.type === 'SOFTWARE').length;
  const addOnCount = products.filter((p) => p.type === 'ADD_ON').length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            Product Catalog & Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse Brightloop software solutions, service packages, and additive pricing variants.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-2 shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action Failed</p>
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

      {/* Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Products</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
          <p className="text-xs text-slate-400 mt-1">Catalog items registered</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-white border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
          <p className="text-xs text-slate-400 mt-1">Available for subscription</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50/50 to-white border-purple-100">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Software Tiers</span>
            <Server className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{softwareCount}</div>
          <p className="text-xs text-slate-400 mt-1">Core platform licenses</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-white border-amber-100">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Add-Ons & Modules</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{addOnCount}</div>
          <p className="text-xs text-slate-400 mt-1">Configurable extensions</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name or keywords..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-44">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="">All Types</option>
                <option value="SOFTWARE">Software</option>
                <option value="SERVICE">Service</option>
                <option value="ADD_ON">Add-On</option>
              </select>
            </div>

            {/* Admin and Staff can filter by status */}
            {!user || user.role !== 'CUSTOMER' ? (
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="flex-1 md:w-36 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
                setSelectedStatus('');
                setPage(1);
              }}
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Product Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <Spinner className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-medium">Loading product catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No products found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              Try adjusting your search criteria or add your first product to get started.
            </p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/products/new')}
              >
                Create Product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Sales Price</th>
                  {isAdmin && <th className="py-3 px-4">Internal Cost</th>}
                  <th className="py-3 px-4">Variants</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        <Link to={`/products/${product.id}`}>{product.name}</Link>
                      </div>
                      {product.notes && (isAdmin || isStaff) && (
                        <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                          {product.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getTypeBadge(product.type)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      ${parseFloat(product.salesPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {product.costPrice ? (
                          `$${parseFloat(product.costPrice).toFixed(2)}`
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      {product.variants && product.variants.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          {product.variants.length} option{product.variants.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {product.isActive ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <Link
                        to={`/products/${product.id}`}
                        className="inline-flex p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details & Price Calculator"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {isAdmin && (
                        <>
                          <Link
                            to={`/products/${product.id}/edit`}
                            className="inline-flex p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                            className={`inline-flex p-1.5 rounded-lg transition-colors ${
                              product.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {products.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-semibold text-slate-800">{page}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Safe Deletion Modal Guard */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">Delete Product</h3>
            <p className="text-sm text-slate-600 text-center mt-2">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-slate-900">'{productToDelete.name}'</span>?
            </p>

            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <strong>Historical Integrity Rule:</strong> If this product is referenced by existing
              quotations, subscriptions, or invoices, the system will reject deletion to preserve
              historical financial audits. In that case, please deactivate it instead.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDeleteProduct}
                isLoading={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
