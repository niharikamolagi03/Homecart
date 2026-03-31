import { useNavigate } from 'react-router';
import {
  Package, ShoppingCart, LogOut, Plus, Trash2, Bell, RefreshCw,
  Store, IndianRupee, Search, ClipboardList, CheckCircle, XCircle,
  Clock, X, AlertTriangle, CreditCard,
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import TimeRemaining from '../../components/TimeRemaining';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getVendorProducts, getMyShopkeeperProducts, deleteShopkeeperProduct,
  getOrders, updateOrderStatus, createPurchaseRequest,
  getMyPurchaseRequests, setSellingPrice, getPendingSetupProducts,
  getMyBilling, makePayment,
} from '@/services/api';
import billingEvents from '@/services/billingEvents';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
interface ActivateTarget { spId: number; basePrice: number; productName: string; }

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

// ── Activation Modal ──────────────────────────────────────────────────────────
function ActivateModal({ target, onClose, onSuccess }: {
  target: ActivateTarget;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const p = parseFloat(price);
    const s = parseInt(stock);
    if (!p || isNaN(p)) { setError('Enter a valid selling price.'); return; }
    if (!s || s < 1) { setError('Stock must be at least 1.'); return; }
    if (p <= target.basePrice) { setError(`Price must be higher than wholesale ₹${target.basePrice}.`); return; }
    setSaving(true);
    try {
      await setSellingPrice(target.spId, { selling_price: p, stock_quantity: s });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to activate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Activate Product</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set your selling price and stock for <span className="font-semibold">{target.productName}</span>.
          Wholesale cost: <span className="font-semibold text-blue-600">₹{target.basePrice}</span>
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label>Selling Price (₹) <span className="text-gray-400 text-xs">must be &gt; ₹{target.basePrice}</span></Label>
            <Input type="number" min={target.basePrice + 0.01} step="0.01"
              placeholder={`e.g. ${(target.basePrice * 1.3).toFixed(0)}`}
              value={price} onChange={e => setPrice(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Stock Quantity</Label>
            <Input type="number" min="1" placeholder="e.g. 50"
              value={stock} onChange={e => setStock(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving}>
            {saving ? 'Activating...' : '✅ Save & Activate'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ShopkeeperDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState<'browse' | 'myshop' | 'requests' | 'orders' | 'billing'>('myshop');
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [pendingSetup, setPendingSetup] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [activateTarget, setActivateTarget] = useState<ActivateTarget | null>(null);
  const [paymentInputs, setPaymentInputs] = useState<Record<number, string>>({});
  const [payingId, setPayingId] = useState<number | null>(null);

  const showToast = (message: string, type: Toast['type'] = 'success') =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vp, mp, reqs, setup, bills, o] = await Promise.all([
        getVendorProducts(),
        getMyShopkeeperProducts(),
        getMyPurchaseRequests(),
        getPendingSetupProducts(),
        getMyBilling(),
        getOrders(),
      ]);
      setVendorProducts(Array.isArray(vp) ? vp : vp.results || []);
      setMyProducts(Array.isArray(mp) ? mp : mp.results || []);
      setMyRequests(Array.isArray(reqs) ? reqs : reqs.results || []);
      setPendingSetup(Array.isArray(setup) ? setup : setup.results || []);
      setBilling(Array.isArray(bills) ? bills : bills.results || []);
      setOrders(Array.isArray(o) ? o : o.results || []);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRequestProduct = async (vp: any) => {
    const qty = parseInt(qtyInputs[vp.id] || '1');
    if (qty < 1) { showToast('Enter a valid quantity', 'error'); return; }
    const existing = myRequests.find((r: any) => r.product_id === vp.id);
    if (existing?.status === 'pending') { showToast('Already have a pending request for this product', 'info'); return; }
    setRequestingId(vp.id);
    try {
      await createPurchaseRequest({ product_id: vp.id, quantity: qty });
      showToast(`Request sent for "${vp.name}". Waiting for vendor approval.`);
      setQtyInputs(p => { const n = { ...p }; delete n[vp.id]; return n; });
      await loadData();
      setActiveTab('requests');
    } catch (err: any) { showToast(err.message || 'Failed to send request', 'error'); }
    finally { setRequestingId(null); }
  };

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from your shop?`)) return;
    try { await deleteShopkeeperProduct(id); setMyProducts(p => p.filter((x: any) => x.id !== id)); showToast(`${name} removed`); }
    catch { showToast('Failed to remove', 'error'); }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
      showToast('Order status updated');
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleMakePayment = async (billId: number, remaining: number) => {
    const amt = parseFloat(paymentInputs[billId] || String(remaining));
    if (!amt || amt <= 0) { showToast('Enter a valid payment amount', 'error'); return; }
    if (amt > remaining) { showToast(`Amount cannot exceed remaining ₹${remaining}`, 'error'); return; }
    setPayingId(billId);
    try {
      const updated = await makePayment(billId, amt);
      setBilling(prev => prev.map((b: any) => b.id === billId ? updated : b));
      setPaymentInputs(p => { const n = { ...p }; delete n[billId]; return n; });
      showToast(updated.status === 'paid' ? '✅ Bill fully paid!' : `💳 Payment of ₹${amt} recorded.`);
      // Fire event so VendorDashboard refreshes its totals instantly
      billingEvents.paid({
        billId,
        newStatus: updated.status,
        amountPaid: parseFloat(updated.amount_paid),
        remainingAmount: parseFloat(updated.remaining_amount),
      });
    } catch (err: any) { showToast(err.message || 'Payment failed', 'error'); }
    finally { setPayingId(null); }
  };

  const filteredVendorProducts = vendorProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingRequests = myRequests.filter((r: any) => r.status === 'pending');
  const unpaidBills = billing.filter((b: any) => b.status !== 'paid');

  const sidebarItems = [
    { icon: Store, label: 'My Shop', active: activeTab === 'myshop', onClick: () => setActiveTab('myshop') },
    { icon: Package, label: 'Browse Products', active: activeTab === 'browse', onClick: () => setActiveTab('browse') },
    { icon: ClipboardList, label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`, active: activeTab === 'requests', onClick: () => setActiveTab('requests') },
    { icon: CreditCard, label: `Billing${unpaidBills.length > 0 ? ` (${unpaidBills.length})` : ''}`, active: activeTab === 'billing', onClick: () => setActiveTab('billing') },
    { icon: ShoppingCart, label: 'Orders', active: activeTab === 'orders', onClick: () => setActiveTab('orders') },
    { icon: LogOut, label: 'Logout', onClick: () => { localStorage.clear(); navigate('/login'); } },
  ];

  const stats = [
    { title: 'Active Products', value: myProducts.filter((p: any) => p.is_active).length, icon: Package, color: 'from-cyan-500 to-blue-500' },
    { title: 'Pending Requests', value: pendingRequests.length, icon: ClipboardList, color: pendingRequests.length > 0 ? 'from-yellow-500 to-orange-500' : 'from-purple-500 to-pink-500' },
    { title: 'Pending Setup', value: pendingSetup.length, icon: IndianRupee, color: pendingSetup.length > 0 ? 'from-red-500 to-pink-500' : 'from-green-500 to-emerald-500' },
    { title: 'Unpaid Bills', value: unpaidBills.length, icon: CreditCard, color: unpaidBills.length > 0 ? 'from-red-600 to-rose-600' : 'from-gray-400 to-gray-500' },
  ];

  const statusBadge = (s: string) => {
    if (s === 'approved') return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const billStatusBadge = (s: string) => {
    if (s === 'paid') return <Badge className="bg-green-100 text-green-700 border-0">✅ Paid</Badge>;
    if (s === 'overdue') return <Badge className="bg-red-100 text-red-700 border-0">⚠ Overdue</Badge>;
    if (s === 'partially_paid') return <Badge className="bg-blue-100 text-blue-700 border-0">⏳ Partial</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 border-0">🕐 Pending</Badge>;
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => <ToastNotification key={t.id} toast={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activateTarget && (
          <ActivateModal
            target={activateTarget}
            onClose={() => setActivateTarget(null)}
            onSuccess={async () => {
              setActivateTarget(null);
              showToast('Product activated! Now visible to customers. ✅');
              await loadData();
              setActiveTab('myshop');
            }}
          />
        )}
      </AnimatePresence>

      <DashboardLayout title="Shopkeeper Dashboard" role="Shopkeeper" sidebarItems={sidebarItems}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600" />
            <div className="relative p-8">
              <h1 className="text-4xl font-bold text-white mb-2">Welcome, {user.name || 'Shopkeeper'}</h1>
              <p className="text-white/90">Manage your shop, requests, and billing.</p>
            </div>
          </motion.div>

          {/* Alert banners */}
          {pendingSetup.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IndianRupee className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800 font-medium">{pendingSetup.length} approved product{pendingSetup.length > 1 ? 's' : ''} need price & stock setup!</p>
              </div>
              <Button size="sm" className="bg-amber-600 text-white" onClick={() => setActiveTab('requests')}>Set Up Now</Button>
            </motion.div>
          )}
          {unpaidBills.filter((b: any) => b.status === 'overdue').length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">You have overdue bills! Please pay to avoid disruption.</p>
              </div>
              <Button size="sm" className="bg-red-600 text-white" onClick={() => setActiveTab('billing')}>View Bills</Button>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5 }}>
                <Card className="border-none shadow-md cursor-pointer" onClick={() => {
                  if (stat.title === 'Pending Requests' || stat.title === 'Pending Setup') setActiveTab('requests');
                  else if (stat.title === 'Unpaid Bills') setActiveTab('billing');
                  else setActiveTab('myshop');
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-gray-500 text-sm mb-1">{stat.title}</p><p className="text-2xl font-bold">{stat.value}</p></div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── MY SHOP TAB ── */}
          {activeTab === 'myshop' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Active Products</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => setActiveTab('browse')} className="bg-cyan-600 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Request from Vendors
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-gray-400" /></div>
                : myProducts.filter((p: any) => p.is_active).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No active products yet.</p>
                    <Button className="mt-4" onClick={() => setActiveTab('browse')}>Browse Vendor Products</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myProducts.filter((p: any) => p.is_active).map((sp: any) => (
                      <motion.div key={sp.id} whileHover={{ y: -4 }}>
                        <Card className="border overflow-hidden">
                          {sp.image_url && <img src={sp.image_url} alt={sp.name} className="w-full h-36 object-cover" />}
                          <CardContent className="p-4">
                            <h3 className="font-semibold line-clamp-1 mb-1">{sp.name}</h3>
                            <p className="text-xs text-gray-500 mb-2">Wholesale: ₹{sp.base_price} | By: {sp.vendor_name}</p>
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-blue-600">Selling: ₹{sp.selling_price}</span>
                              <span className={`text-sm font-medium ${sp.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>Stock: {sp.stock}</span>
                            </div>
                            <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700" onClick={() => handleRemove(sp.id, sp.name)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── BROWSE TAB ── */}
          {activeTab === 'browse' && (
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Browse Vendor Products</CardTitle>
                <div className="relative mt-2 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent>
                {filteredVendorProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400"><Package className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No vendor products available.</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVendorProducts.map((vp: any) => {
                      const existingReq = myRequests.find((r: any) => r.product_id === vp.id);
                      const alreadyActive = myProducts.some((mp: any) => mp.vendor_product_id === vp.id && mp.is_active);
                      return (
                        <motion.div key={vp.id} whileHover={{ y: -4 }}>
                          <Card className="border overflow-hidden">
                            {vp.image_url && <img src={vp.image_url} alt={vp.name} className="w-full h-36 object-cover" />}
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold line-clamp-1">{vp.name}</h3>
                                <Badge variant="outline" className="text-xs ml-1 shrink-0">{vp.category_name || 'General'}</Badge>
                              </div>
                              <p className="text-xs text-gray-500 mb-1">By: {vp.vendor_name}</p>
                              <p className="text-sm font-semibold text-gray-700 mb-3">Wholesale: ₹{vp.base_price} | Stock: {vp.stock}</p>
                              {alreadyActive ? (
                                <Badge className="w-full justify-center bg-green-100 text-green-700 border-0">Already in your shop</Badge>
                              ) : existingReq ? (
                                <div className="text-center">{statusBadge(existingReq.status)}</div>
                              ) : (
                                <div className="space-y-2">
                                  <div>
                                    <Label className="text-xs">Quantity to request</Label>
                                    <Input type="number" min="1" max={vp.stock} placeholder="Qty"
                                      value={qtyInputs[vp.id] || ''} onChange={e => setQtyInputs(p => ({ ...p, [vp.id]: e.target.value }))} className="h-8 text-sm" />
                                  </div>
                                  <Button size="sm" className="w-full bg-cyan-600 text-white" disabled={requestingId === vp.id} onClick={() => handleRequestProduct(vp)}>
                                    {requestingId === vp.id ? 'Sending...' : <span className="flex items-center justify-center"><Plus className="w-3 h-3 mr-1" />Request from Vendor</span>}
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── REQUESTS TAB ── */}
          {activeTab === 'requests' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Purchase Requests</CardTitle>
                <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No requests yet.</p>
                    <Button className="mt-4" onClick={() => setActiveTab('browse')}>Browse Products</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((req: any) => {
                      const sp = pendingSetup.find((p: any) => p.vendor_product_id === req.product_id);
                      const needsSetup = req.status === 'approved' && sp;
                      const activeProduct = myProducts.find((p: any) => p.vendor_product_id === req.product_id && p.is_active);
                      return (
                        <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <Card className={`border ${needsSetup ? 'border-amber-300 bg-amber-50' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  {req.image_url && <img src={req.image_url} alt={req.product_name} className="w-14 h-14 object-cover rounded-lg" />}
                                  <div>
                                    <p className="font-semibold text-gray-900">{req.product_name}</p>
                                    <p className="text-sm text-gray-500">Vendor: {req.vendor_name} • Qty: {req.quantity}</p>
                                    <p className="text-xs text-gray-400">Wholesale: ₹{req.product_base_price}</p>
                                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {statusBadge(req.status)}
                                  {needsSetup && sp && (
                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
                                      onClick={() => setActivateTarget({ spId: sp.id, basePrice: parseFloat(req.product_base_price), productName: req.product_name })}>
                                      ⚡ Set Price & Activate
                                    </Button>
                                  )}
                                  {req.status === 'approved' && activeProduct && (
                                    <p className="text-xs text-green-600 font-medium">✅ Active at ₹{activeProduct.selling_price} | Stock: {activeProduct.stock}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── BILLING TAB ── */}
          {activeTab === 'billing' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Billing</CardTitle>
                <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {billing.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No billing records yet. Bills are created when vendors approve your requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {billing.map((bill: any) => (
                      <motion.div key={bill.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className={`border ${bill.status === 'overdue' ? 'border-red-300 bg-red-50' : bill.status === 'paid' ? 'border-green-200 bg-green-50' : bill.status === 'partially_paid' ? 'border-blue-200 bg-blue-50' : 'border-yellow-200 bg-yellow-50'}`}>
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{bill.product_name}</p>
                                <p className="text-sm text-gray-600">Vendor: {bill.vendor_name}</p>
                                <p className="text-sm text-gray-600">Qty: {bill.quantity} × ₹{bill.cost_price}</p>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                  <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="font-bold text-gray-800">₹{bill.total_amount}</p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-xs text-gray-500">Paid</p>
                                    <p className="font-bold text-green-600">₹{bill.amount_paid}</p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-xs text-gray-500">Remaining</p>
                                    <p className={`font-bold ${parseFloat(bill.remaining_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{bill.remaining_amount}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Due: {new Date(bill.due_date).toLocaleString()}
                                  {bill.is_overdue && <span className="ml-2 text-red-600 font-semibold">⚠ OVERDUE</span>}
                                </p>
                                <div className="mt-1">
                                  <TimeRemaining initialSeconds={bill.seconds_remaining} />
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                {billStatusBadge(bill.status)}
                                {bill.status !== 'paid' && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <div>
                                      <Label className="text-xs">Amount (₹)</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={bill.remaining_amount}
                                        step="0.01"
                                        placeholder={`Max ₹${bill.remaining_amount}`}
                                        value={paymentInputs[bill.id] || ''}
                                        onChange={e => setPaymentInputs(p => ({ ...p, [bill.id]: e.target.value }))}
                                        className="h-8 text-sm w-32"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white mt-4"
                                      disabled={payingId === bill.id}
                                      onClick={() => handleMakePayment(bill.id, parseFloat(bill.remaining_amount))}
                                    >
                                      {payingId === bill.id ? '...' : '💳 Pay'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {/* Summary footer */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                      {[
                        { label: 'Total Billed', value: billing.reduce((s: number, b: any) => s + parseFloat(b.total_amount), 0), color: 'text-gray-800' },
                        { label: 'Total Paid', value: billing.reduce((s: number, b: any) => s + parseFloat(b.amount_paid), 0), color: 'text-green-600' },
                        { label: 'Outstanding', value: billing.filter((b: any) => b.status !== 'paid').reduce((s: number, b: any) => s + parseFloat(b.remaining_amount), 0), color: 'text-red-600' },
                        { label: 'Overdue', value: billing.filter((b: any) => b.status === 'overdue').reduce((s: number, b: any) => s + parseFloat(b.remaining_amount), 0), color: 'text-orange-600' },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-gray-500 text-xs">{item.label}</p>
                          <p className={`font-bold ${item.color}`}>₹{item.value.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── ORDERS TAB ── */}
          {activeTab === 'orders' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Customer Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400"><ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No orders yet.</p></div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order: any) => (
                      <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-3">
                        <div>
                          <p className="font-semibold">Order #{order.id}</p>
                          <p className="text-sm text-gray-500">{order.customer?.name} • {new Date(order.created_at).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-500">{order.delivery_address}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-blue-600">₹{order.total_price}</p>
                            <Badge className={order.status === 'DELIVERED' ? 'bg-green-100 text-green-700 border-0' : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-0' : 'bg-yellow-100 text-yellow-700 border-0'}>
                              {order.status}
                            </Badge>
                          </div>
                          {order.status === 'PENDING' && <Button size="sm" className="bg-green-600 text-white" onClick={() => handleStatusUpdate(order.id, 'ACCEPTED')}>Accept</Button>}
                          {order.status === 'ACCEPTED' && <Button size="sm" className="bg-blue-600 text-white" onClick={() => handleStatusUpdate(order.id, 'PREPARING')}>Preparing</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </DashboardLayout>
    </>
  );
}
