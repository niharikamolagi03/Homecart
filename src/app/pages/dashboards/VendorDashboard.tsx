import { useNavigate } from 'react-router';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Plus, Edit, Trash2, Bell, RefreshCw, IndianRupee, Users, CreditCard, AlertTriangle, ArrowUpDown } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import TimeRemaining from '../../components/TimeRemaining';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ProductForm from '../../components/ProductForm';
import { getMyVendorProducts, deleteVendorProduct, getOrders, getVendorPurchaseRequests, approvePurchaseRequest, rejectPurchaseRequest, getVendorBilling, getVendorRevenueSummary, getVendorStock } from '@/services/api';
import billingEvents from '@/services/billingEvents';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' }[toast.type];
  return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
      className={`${bg} text-white px-6 py-3 rounded-lg shadow-lg mb-3 flex items-center gap-3 min-w-[300px]`}>
      <Bell className="w-5 h-5" /><span>{toast.message}</span>
    </motion.div>
  );
};

export default function VendorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [revenue, setRevenue] = useState({ earned_revenue: 0, pending_revenue: 0, overdue_revenue: 0, total_billed: 0 });
  const [vendorBilling, setVendorBilling] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'requests' | 'orders' | 'billing' | 'approvals'>('products');
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (message: string, type: Toast['type'] = 'success') =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getMyVendorProducts();
      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      showToast('Failed to load products', 'error');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const [data, rev, reqs, bills] = await Promise.all([
        getOrders(), getVendorRevenueSummary(), getVendorPurchaseRequests(), getVendorBilling()
      ]);
      setOrders(Array.isArray(data) ? data : data.results || []);
      setRevenue(rev);
      setRequests(Array.isArray(reqs) ? reqs : reqs.results || []);
      setVendorBilling(Array.isArray(bills) ? bills : bills.results || []);
    } catch { /* silent */ }
  }, []);

  const loadVendorOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders/vendor-orders/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setVendorOrders(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load vendor orders:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadOrders(), loadVendorOrders()]);
    setLoading(false);
  }, [loadProducts, loadOrders, loadVendorOrders]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll billing every 30s when on billing tab so totals stay live
  useEffect(() => {
    if (activeTab === 'billing') {
      pollRef.current = setInterval(loadOrders, 30_000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeTab, loadOrders]);

  // Instantly refresh when shopkeeper makes a payment (fired by billingEvents.paid())
  useEffect(() => {
    return billingEvents.onPaid(() => loadOrders());
  }, [loadOrders]);

  // Bug 3: poll stock every 10s when on products tab — updates without page refresh
  useEffect(() => {
    if (activeTab !== 'products') return;
    const id = setInterval(async () => {
      try {
        const stockList: { id: number; stock: number }[] = await getVendorStock();
        setProducts(prev => prev.map((p: any) => {
          const updated = stockList.find((s: any) => s.id === p.id);
          return updated ? { ...p, stock: updated.stock } : p;
        }));
      } catch { /* silent — don't disrupt UI */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [activeTab]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteVendorProduct(id);
      setProducts(prev => prev.filter((p: any) => p.id !== id));
      showToast(`Deleted ${name}`);
    } catch (err: any) { showToast(err.message || 'Failed to delete', 'error'); }
  };

  const pendingRequests = requests.filter((r: any) => r.status === 'pending');
  const unpaidBilling = vendorBilling.filter((b: any) => b.status !== 'paid');
  const pendingApprovals = vendorOrders.filter((o: any) => 
    o.vendor_approvals?.some((a: any) => a.vendor === user.id && a.status === 'PENDING')
  );

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Products', active: activeTab === 'products', onClick: () => setActiveTab('products') },
    { icon: Users, label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`, active: activeTab === 'requests', onClick: () => setActiveTab('requests') },
    { icon: ShoppingCart, label: 'Orders', active: activeTab === 'orders', onClick: () => setActiveTab('orders') },
    { icon: AlertTriangle, label: `Approvals${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}`, active: activeTab === 'approvals', onClick: () => setActiveTab('approvals') },
    { icon: CreditCard, label: `Payments${unpaidBilling.length > 0 ? ` (${unpaidBilling.length})` : ''}`, active: activeTab === 'billing', onClick: () => setActiveTab('billing') },
    { icon: LogOut, label: 'Logout', onClick: () => { localStorage.clear(); navigate('/login'); } },
  ];

  const handleApprove = async (id: number) => {
    try {
      await approvePurchaseRequest(id);
      setRequests(prev => prev.map((r: any) => r.id === id ? { ...r, status: 'approved' } : r));
      showToast('Request approved! Shopkeeper notified.');
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectPurchaseRequest(id);
      setRequests(prev => prev.map((r: any) => r.id === id ? { ...r, status: 'rejected' } : r));
      showToast('Request rejected. Shopkeeper notified.', 'info');
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleApprovalAction = async (orderId: number, action: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/orders/vendor-approval-action/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ order_id: orderId, action }),
      });

      if (!response.ok) throw new Error('Failed to update approval');

      const result = await response.json();
      showToast(action === 'APPROVED' ? 'Order approved!' : 'Order rejected.', action === 'APPROVED' ? 'success' : 'info');
      
      // Refresh vendor orders to show updated status
      loadVendorOrders();
    } catch (err: any) {
      showToast(err.message || 'Failed to update approval', 'error');
    }
  };

  const stats = [
    { title: 'My Products', value: products.length, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { title: 'Pending Requests', value: pendingRequests.length, icon: Users, color: pendingRequests.length > 0 ? 'from-red-500 to-orange-500' : 'from-purple-500 to-pink-500' },
    { title: 'Earned Revenue', value: `₹${revenue.earned_revenue.toFixed(0)}`, icon: IndianRupee, color: 'from-green-500 to-emerald-500' },
    { title: 'Pending Revenue', value: `₹${revenue.pending_revenue.toFixed(0)}`, icon: CreditCard, color: revenue.pending_revenue > 0 ? 'from-orange-500 to-amber-500' : 'from-gray-400 to-gray-500' },
  ];

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => <ToastNotification key={t.id} toast={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
        </AnimatePresence>
      </div>

      {(showForm || editProduct) && (
        <ProductForm
          existing={editProduct}
          onSuccess={() => {
            setShowForm(false);
            setEditProduct(null);
            loadProducts(); // Refresh immediately after add/edit
            showToast(editProduct ? 'Product updated!' : 'Product added!');
          }}
          onCancel={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}

      <DashboardLayout title="Vendor Dashboard" role="Vendor" sidebarItems={sidebarItems}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Banner */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600" />
            <div className="relative p-8 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Welcome, {user.name || 'Vendor'}</h1>
                <p className="text-white/90">Add wholesale products for shopkeepers to resell.</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5 }}>
                <Card className="border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-gray-500 text-sm mb-1">{stat.title}</p><p className="text-2xl font-bold text-gray-900">{stat.value}</p></div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Products Tab */}
          {activeTab === 'products' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Products ({products.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadProducts} title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-gray-400" /><p className="text-gray-400 mt-2">Loading...</p></div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-4">No products yet. Add your first wholesale product!</p>
                    <Button onClick={() => setShowForm(true)} className="bg-blue-600 text-white">Add Product</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product: any) => (
                      <motion.div key={product.id} whileHover={{ y: -4 }}>
                        <Card className="border overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <div className="w-full h-40 bg-gray-100 flex items-center justify-center"><Package className="w-10 h-10 text-gray-300" /></div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                              <Badge variant="outline" className="text-xs ml-2 shrink-0">{product.category_name || 'General'}</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-blue-600">₹{product.base_price} <span className="text-xs text-gray-400 font-normal">wholesale</span></span>
                              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>Stock: {product.stock}</span>
                            </div>
                            {product.shopkeeper_count > 0 && (
                              <p className="text-xs text-purple-600 mb-2">Used by {product.shopkeeper_count} shopkeeper(s)</p>
                            )}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditProduct(product)}>
                                <Edit className="w-3 h-3 mr-1" /> Edit
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700" onClick={() => handleDelete(product.id, product.name)}>
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Purchase Requests Tab */}
          {activeTab === 'requests' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Purchase Requests from Shopkeepers</CardTitle>
                <Button variant="outline" size="sm" onClick={loadOrders}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No purchase requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req: any) => (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {req.image_url && <img src={req.image_url} alt={req.product_name} className="w-14 h-14 object-cover rounded-lg" />}
                          <div>
                            <p className="font-semibold text-gray-900">{req.product_name}</p>
                            <p className="text-sm text-gray-500">From: {req.shopkeeper_name} • Qty: {req.quantity}</p>
                            <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>{req.status}</Badge>
                          {req.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 text-white" onClick={() => handleApprove(req.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleReject(req.id)}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Revenue Summary */}
              <Card className="border-none shadow-md bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Revenue Summary (Billing-based)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Earned (Paid)', value: revenue.earned_revenue, color: 'text-green-600' },
                      { label: 'Pending', value: revenue.pending_revenue, color: 'text-orange-500' },
                      { label: 'Overdue', value: revenue.overdue_revenue, color: 'text-red-600' },
                      { label: 'Total Billed', value: revenue.total_billed, color: 'text-blue-600' },
                    ].map(item => (
                      <div key={item.label} className="text-center p-3 bg-white/70 rounded-xl">
                        <p className={`text-xl font-bold ${item.color}`}>₹{item.value.toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>All Orders</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadOrders}><RefreshCw className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No orders yet.</p></div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50">
                          <div>
                            <p className="font-semibold">Order #{order.id}</p>
                            <p className="text-sm text-gray-500">{order.customer?.name} • {new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">₹{order.total_price}</p>
                            <Badge className={order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{order.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Billing / Pending Payments Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Revenue summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Earned Revenue', value: revenue.earned_revenue, color: 'text-green-600', bg: 'from-green-50 to-emerald-50' },
                  { label: 'Pending Revenue', value: revenue.pending_revenue, color: 'text-orange-500', bg: 'from-orange-50 to-amber-50' },
                  { label: 'Overdue Revenue', value: revenue.overdue_revenue, color: 'text-red-600', bg: 'from-red-50 to-rose-50' },
                  { label: 'Total Billed', value: revenue.total_billed, color: 'text-blue-600', bg: 'from-blue-50 to-cyan-50' },
                ].map(item => (
                  <Card key={item.label} className={`border-none shadow-md bg-gradient-to-br ${item.bg}`}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-2xl font-bold ${item.color}`}>₹{item.value.toFixed(0)}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Granular debt list */}
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                  <CardTitle>Pending Revenue — by Shopkeeper</CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Sort toggle */}
                    <Button variant="outline" size="sm" onClick={() => setBillSort(s => s === 'due_date' ? 'remaining_amount' : 'due_date')}>
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      Sort: {billSort === 'due_date' ? 'Due Date' : 'Amount'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadOrders}><RefreshCw className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {vendorBilling.filter((b: any) => b.status !== 'paid').length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No pending payments. All bills are settled!</p>
                    </div>
                  ) : (
                    <>
                      {/* Column headers */}
                      <div className="hidden sm:grid grid-cols-6 gap-3 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b mb-2">
                        <span className="col-span-2">Shopkeeper / Product</span>
                        <span className="text-right">Amount Owed</span>
                        <span className="text-right">Paid</span>
                        <span className="text-center">Activation</span>
                        <span className="text-center">Time Remaining</span>
                      </div>

                      <div className="space-y-2">
                        {[...vendorBilling]
                          .filter((b: any) => b.status !== 'paid')
                          .sort((a: any, b: any) => {
                            if (billSort === 'due_date') return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                            return parseFloat(b.remaining_amount) - parseFloat(a.remaining_amount);
                          })
                          .map((bill: any) => (
                            <motion.div key={bill.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                              <div className={`grid grid-cols-1 sm:grid-cols-6 gap-3 items-center p-3 rounded-xl border ${
                                bill.status === 'overdue' ? 'border-red-200 bg-red-50' :
                                bill.status === 'partially_paid' ? 'border-blue-200 bg-blue-50' :
                                'border-yellow-200 bg-yellow-50'
                              }`}>
                                {/* Shopkeeper + Product */}
                                <div className="sm:col-span-2">
                                  <p className="font-semibold text-gray-900 text-sm">{bill.shopkeeper_name}</p>
                                  <p className="text-xs text-gray-500">{bill.product_name}</p>
                                  <p className="text-xs text-gray-400">Qty: {bill.quantity} × ₹{bill.cost_price}</p>
                                  <div className="mt-1">
                                    <Badge className={`text-xs border-0 ${
                                      bill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                      bill.status === 'partially_paid' ? 'bg-blue-100 text-blue-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {bill.status === 'overdue' ? '⚠ Overdue' : bill.status === 'partially_paid' ? '⏳ Partial' : '🕐 Pending'}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Amount Owed */}
                                <div className="sm:text-right">
                                  <p className="text-xs text-gray-500 sm:hidden">Amount Owed</p>
                                  <p className="font-bold text-gray-900">₹{bill.total_amount}</p>
                                  <p className="text-xs text-red-600 font-medium">Remaining: ₹{bill.remaining_amount}</p>
                                </div>

                                {/* Paid */}
                                <div className="sm:text-right">
                                  <p className="text-xs text-gray-500 sm:hidden">Paid</p>
                                  <p className="text-sm font-semibold text-green-600">₹{bill.amount_paid}</p>
                                </div>

                                {/* Activation date */}
                                <div className="sm:text-center">
                                  <p className="text-xs text-gray-500 sm:hidden">Activated</p>
                                  <p className="text-xs text-gray-600">{new Date(bill.activation_date).toLocaleDateString()}</p>
                                  <p className="text-xs text-gray-400">{new Date(bill.activation_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>

                                {/* Live countdown — identical formula to shopkeeper view */}
                                <div className="sm:text-center">
                                  <p className="text-xs text-gray-500 sm:hidden mb-1">Time Remaining</p>
                                  <TimeRemaining initialSeconds={bill.seconds_remaining} compact />
                                  <p className="text-xs text-gray-400 mt-1">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Paid bills — collapsed section */}
              {vendorBilling.filter((b: any) => b.status === 'paid').length > 0 && (
                <Card className="border-none shadow-md bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-700 text-base">
                      ✅ Settled Bills ({vendorBilling.filter((b: any) => b.status === 'paid').length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {vendorBilling.filter((b: any) => b.status === 'paid').map((bill: any) => (
                        <div key={bill.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-green-200 text-sm">
                          <div>
                            <span className="font-medium text-gray-800">{bill.shopkeeper_name}</span>
                            <span className="text-gray-500 mx-2">·</span>
                            <span className="text-gray-600">{bill.product_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">₹{bill.total_amount}</p>
                            <p className="text-xs text-gray-400">{new Date(bill.activation_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Order Approvals</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadVendorOrders}><RefreshCw className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent>
                  {vendorOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No orders requiring approval.</p></div>
                  ) : (
                    <div className="space-y-4">
                      {vendorOrders.map((order: any) => {
                        const myApproval = order.vendor_approvals?.find((a: any) => a.vendor === user.id);
                        const isPending = myApproval?.status === 'PENDING';
                        const isApproved = myApproval?.status === 'APPROVED';
                        const isRejected = myApproval?.status === 'REJECTED';

                        return (
                          <div key={order.id} className="border rounded-xl p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                                <p className="text-sm text-gray-500">
                                  Customer: {order.customer?.name} • {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-600">₹{order.total_price}</p>
                                <Badge className={
                                  order.status === 'PENDING_VENDOR_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                                  order.status === 'VENDOR_APPROVED' ? 'bg-green-100 text-green-700' :
                                  order.status === 'VENDOR_REJECTED' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {order.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="mb-4">
                              <h4 className="font-medium text-sm text-gray-700 mb-2">Items from your store:</h4>
                              <div className="space-y-2">
                                {order.items?.filter((item: any) => item.vendor === user.id).map((item: any) => (
                                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <div>
                                      <span className="font-medium">{item.product?.name}</span>
                                      <span className="text-sm text-gray-500 ml-2">Qty: {item.quantity}</span>
                                    </div>
                                    <span className="font-semibold">₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Approval Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Your approval:</span>
                                <Badge className={
                                  isApproved ? 'bg-green-100 text-green-700' :
                                  isRejected ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }>
                                  {isApproved ? '✓ Approved' : isRejected ? '✗ Rejected' : '⏳ Pending'}
                                </Badge>
                              </div>

                              {/* Action Buttons */}
                              {isPending && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleApprovalAction(order.id, 'REJECTED')}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprovalAction(order.id, 'APPROVED')}
                                  >
                                    Approve
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
