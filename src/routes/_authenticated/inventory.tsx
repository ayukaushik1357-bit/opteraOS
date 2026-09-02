import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Package, Plus, Search, AlertTriangle, ArrowUpDown, RefreshCw, CheckCircle2,
  TrendingDown, TrendingUp, ShieldAlert, BarChart3, Filter, Tag, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { productsApi } from '@/lib/api';
import { authStorage } from '@/lib/api/client';

export const Route = createFileRoute('/_authenticated/inventory')({
  component: InventoryPage,
});

function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState<any | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState('PURCHASE');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    supplier: '',
    unit: 'pcs',
  });

  const orgId = authStorage.getOrgId() || 'default';

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productsApi.list(orgId, { search, lowStock: lowStockFilter ? 'true' : undefined });
      setProducts(res.rows || []);
    } catch (err: any) {
      setProducts([]);
      toast.error('Failed to load inventory products from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, lowStockFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productsApi.create(orgId, newProduct);
      toast.success('Product created successfully');
      setShowAddModal(false);
      setNewProduct({ name: '', sku: '', price: 0, cost: 0, stock: 0, minStock: 5, supplier: '', unit: 'pcs' });
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    }
  };

  const handleAdjustStock = async () => {
    if (!showStockModal || stockAdjustment === 0) return;
    try {
      await productsApi.adjustStock(orgId, showStockModal.id, {
        quantity: Number(stockAdjustment),
        type: adjustmentType,
        notes: adjustmentNotes,
      });
      toast.success('Stock adjusted successfully');
      setShowStockModal(null);
      setStockAdjustment(0);
      setAdjustmentNotes('');
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock');
    }
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const totalValue = products.reduce((acc, p) => acc + p.stock * p.price, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Inventory &amp; Products</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Real-time stock tracking, SKUs, inventory movements, and automated replenishment alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadProducts}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-9 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#E5EAF1] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total SKUs</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{products.length}</div>
          <div className="text-xs text-gray-400 mt-1">Across all categories</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5EAF1] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
          <div className="text-xs text-gray-400 mt-1">Require immediate restocking</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5EAF1] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Stock Valuation</span>
            <BarChart3 className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString('en-IN')}</div>
          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Retail asset value
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5EAF1] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Auto-Restock</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">Enabled</div>
          <div className="text-xs text-gray-400 mt-1">Autonomous triggers active</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by product name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={lowStockFilter ? 'default' : 'outline'}
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`gap-2 text-xs h-9 ${
              lowStockFilter
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold hover:bg-amber-100'
                : 'text-gray-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Low Stock Only ({lowStockCount})
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-[#F8FAFC] text-xs uppercase font-semibold text-gray-500 border-b border-[#E5EAF1]">
              <tr>
                <th className="py-3.5 px-4">Product / SKU</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Unit Cost</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    No products found. Click "Add Product" to create your first item.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {p.sku || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{p.supplier || 'Direct'}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">₹{Number(p.price).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-gray-500">₹{Number(p.cost).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLow ? 'text-amber-600' : 'text-green-700'}`}>
                            {p.stock} {p.unit || 'pcs'}
                          </span>
                          <span className="text-xs text-gray-400">(Min: {p.minStock})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowStockModal(p)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" /> Adjust Stock
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-6 md:p-8 max-w-lg w-full shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Add New Product
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Product Name *</label>
                <Input
                  required
                  placeholder="e.g. Cloud Server Pro"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">SKU Code</label>
                  <Input
                    placeholder="e.g. OPT-SKU-100"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Supplier</label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={newProduct.supplier}
                    onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Selling Price (₹) *</label>
                  <Input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Unit Cost (₹)</label>
                  <Input
                    type="number"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Initial Stock</label>
                  <Input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Min. Alert Stock</label>
                  <Input
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5EAF1]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h2 className="text-lg font-bold text-gray-900">Adjust Stock: {showStockModal.name}</h2>
              <button onClick={() => setShowStockModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Current Stock</label>
                <div className="text-xl font-bold text-blue-600 mt-1">{showStockModal.stock} units</div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Movement Type</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full mt-1 bg-white border border-[#E5EAF1] rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="PURCHASE">Purchase / Inbound Stock (+)</option>
                  <option value="SALE">Sale / Outbound Delivery (-)</option>
                  <option value="RETURN">Customer Return (+)</option>
                  <option value="ADJUSTMENT">Stock Audit Correction (+/-)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Quantity to Change</label>
                <Input
                  type="number"
                  placeholder="e.g. 10 or -5"
                  value={stockAdjustment || ''}
                  onChange={(e) => setStockAdjustment(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">Notes / Reason</label>
                <Input
                  placeholder="e.g. Restocked from supplier batch #481"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <Button variant="outline" onClick={() => setShowStockModal(null)}>Cancel</Button>
                <Button onClick={handleAdjustStock} className="bg-blue-600 hover:bg-blue-700 text-white">Save Movement</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
