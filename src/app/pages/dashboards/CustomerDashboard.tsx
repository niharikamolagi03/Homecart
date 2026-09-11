import { useNavigate } from 'react-router';
import { ShoppingBag, History, LogOut, ShoppingCart, Package, Bell, X, Search, MapPin, RefreshCw, Package2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback } from 'react';
import CustomerMap from '../../components/CustomerMap';
import Checkout from '../../components/Checkout';
import { getShopkeeperProducts, getCart, addToCart, removeFromCart, getOrders, getVendorProducts, createBulkRequest, getMyBulkRequests } from '@/services/api';

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

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders' | 'bulk'>('shop');
  const [showCheckout, setShowCheckout] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Bulk order state
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [bulkRequests, setBulkRequests] = useState<any[]>([]);
  const [bulkForm, setBulkForm] = useState<{ vendorId: number; vendorName: string; productName: string; quantity: string; notes: string } | null>(null);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const showToast = (message: string, type: Toast['type'] = 'success') =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, o] = await Promise.all([getShopkeeperProducts(), getCart(), getOrders()]);
      setProducts(Array.isArray(p) ? p : p.results || []);
      setCart(c);
      setOrders(Array.isArray(o) ? o : o.results || []);
    } catch (err) {
      showToast('Failed to load data', 'error');
    }
    finally { setLoading(false); }
  }, []);

  const loadBulkData = useCallback(async () => {
    try {
      const [vp, reqs] = await Promise.all([getVendorProducts(), getMyBulkRequests()]);
      setVendorProducts(Array.isArray(vp) ? vp : vp.results || []);
      setBulkRequests(Array.isArray(reqs) ? reqs : reqs.results || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (activeTab === 'bulk') loadBulkData(); }, [activeTab, loadBulkData]);

  const handleAddToCart = async (product: any) => {
    try {
      const result = await addToCart({ product_id: product.id, quantity: 1 });
      setCart(result);
      showToast(`${product.name} added to cart 🛒`);
    } catch (err: any) {
      console.error('Add to cart error:', err);
      showToast(err.message || 'Failed to add to cart', 'error');
    }
  };

  const handleRemoveFromCart = async (itemId: number) => {
    try {
      await removeFromCart(itemId);
      await loadData();
      showToast('Item removed from cart');
    } catch { showToast('Failed to remove item', 'error'); }
  };

  const cartItems = cart?.items || [];
  const cartTotal = parseFloat(cart?.total_price || '0');
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const sidebarItems = [
    { icon: ShoppingBag, label: 'Shop', active: activeTab === 'shop', onClick: () => setActiveTab('shop') },
    { icon: ShoppingCart, label: `Cart (${cartItems.length})`, active: activeTab === 'cart', onClick: () => setActiveTab('cart') },
    { icon: History, label: 'Orders', active: activeTab === 'orders', onClick: () => setActiveTab('orders') },
    { icon: Package2, label: 'Bulk Orders', active: activeTab === 'bulk', onClick: () => setActiveTab('bulk') },
    { icon: LogOut, label: 'Logout', onClick: () => { localStorage.clear(); navigate('/login'); } },
  ];

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => <ToastNotification key={t.id} toast={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
        </AnimatePresence>
      </div>

      {showCheckout && (
        <Checkout
          cartTotal={cartTotal}
          onSuccess={() => { setShowCheckout(false); loadData(); setActiveTab('orders'); showToast('Order placed successfully! 🎉'); }}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {trackingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Track Order #{trackingOrder.id}</h2>
              <button onClick={() => setTrackingOrder(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <p>Status: <Badge>{trackingOrder.status}</Badge></p>
                <p className="mt-1 text-gray-600">Address: {trackingOrder.delivery_address}</p>
              </div>
              <CustomerMap
                orderId={trackingOrder.id}
                customerLat={trackingOrder.latitude}
                customerLng={trackingOrder.longitude}
              />
            </div>
          </div>
        </div>
      )}

      <DashboardLayout title="Customer Dashboard" role="Customer" sidebarItems={sidebarItems}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Banner */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
            <div className="relative p-8">
              <h1 className="text-4xl font-bold text-white mb-2">Welcome, {user.name || 'Customer'}</h1>
              <p className="text-white/90">Discover amazing products from local vendors.</p>
            </div>
          </motion.div>

          {/* Shop Tab */}
          {activeTab === 'shop' && (
            <div>
              <div className="relative mb-6 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {loading ? (
                <div className="text-center py-12 text-gray-400"><RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" /><p>Loading products...</p></div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Package className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No products found.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product: any, i: number) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -6 }}>
                      <Card className="overflow-hidden hover:shadow-xl transition-all">
                        <div className="relative h-48 bg-gray-100">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-gray-300" /></div>
                          )}
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Badge className="bg-red-500 text-white">Out of Stock</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">{product.name}</h3>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-600">{fmt(parseFloat(product.selling_price))}</span>
                            <Button
                              size="sm"
                              disabled={product.stock === 0}
                              onClick={() => handleAddToCart(product)}
                              className="bg-blue-600 text-white"
                            >
                              <ShoppingCart className="w-3 h-3 mr-1" /> Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Cart ({cartItems.length} items)</CardTitle>
                <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Your cart is empty</p>
                    <Button className="mt-4" onClick={() => setActiveTab('shop')}>Start Shopping</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cartItems.map((item: any) => (
                        <div key={item.id} className="flex gap-4 p-4 border rounded-xl">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            {item.product_details?.image_url ? (
                              <img src={item.product_details.image_url} alt={item.product_details.name} className="w-full h-full object-cover" />
                            ) : <Package className="w-8 h-8 m-auto mt-6 text-gray-300" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-semibold">{item.product_details?.name}</h3>
                              <button onClick={() => handleRemoveFromCart(item.id)}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                            </div>
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            <p className="font-bold text-blue-600">{fmt(parseFloat(item.total_price))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-2xl font-bold text-blue-600">{fmt(cartTotal)}</span>
                      </div>
                      <Button onClick={() => setShowCheckout(true)} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white" size="lg">
                        Proceed to Checkout
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No orders yet</p>
                    <Button className="mt-4" onClick={() => setActiveTab('shop')}>Start Shopping</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <div key={order.id} className="p-4 border rounded-xl hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">Order #{order.id}</p>
                            <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500 mt-1">{order.delivery_address}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge className="text-xs bg-gray-100 text-gray-600 border-0">
                                {order.payment_method === 'UPI' ? '📱 UPI' : '💵 Cash on Delivery'}
                              </Badge>
                              <Badge className={`text-xs border-0 ${
                                order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
                                order.payment_status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.payment_status === 'PAID' ? '✓ Paid' :
                                 order.payment_status === 'FAILED' ? '✗ Failed' : '⏳ Pending'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">{fmt(parseFloat(order.total_price))}</p>
                            <Badge className={
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                              order.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>{order.status}</Badge>
                          </div>
                        </div>
                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <Button size="sm" variant="outline" onClick={() => setTrackingOrder(order)} className="w-full">
                            <MapPin className="w-4 h-4 mr-2" /> Track Live Location
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Bulk Orders Tab */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              {/* Bulk request form modal */}
              {bulkForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Bulk Order Request</h2>
                      <button onClick={() => setBulkForm(null)}><X className="w-5 h-5" /></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Sending bulk request to <span className="font-semibold text-gray-800">{bulkForm.vendorName}</span>
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label>Product Name *</Label>
                        <Input className="mt-1" placeholder="e.g. Rice 25kg bags"
                          value={bulkForm.productName}
                          onChange={e => setBulkForm(f => f && ({ ...f, productName: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Quantity *</Label>
                        <Input className="mt-1" type="number" min="1" placeholder="e.g. 100"
                          value={bulkForm.quantity}
                          onChange={e => setBulkForm(f => f && ({ ...f, quantity: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Notes / Requirements</Label>
                        <textarea
                          className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Any special requirements, delivery date, etc."
                          value={bulkForm.notes}
                          onChange={e => setBulkForm(f => f && ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" className="flex-1" onClick={() => setBulkForm(null)}>Cancel</Button>
                      <Button
                        className="flex-1 bg-blue-600 text-white"
                        disabled={submittingBulk || !bulkForm.productName.trim() || !bulkForm.quantity}
                        onClick={async () => {
                          if (!bulkForm.productName.trim() || parseInt(bulkForm.quantity) < 1) return;
                          setSubmittingBulk(true);
                          try {
                            await createBulkRequest({
                              vendor_id: bulkForm.vendorId,
                              product_name: bulkForm.productName.trim(),
                              quantity: parseInt(bulkForm.quantity),
                              notes: bulkForm.notes.trim(),
                            });
                            setBulkForm(null);
                            showToast('Bulk request sent! Vendor will respond soon.');
                            loadBulkData();
                          } catch (err: any) {
                            showToast(err.message || 'Failed to send request', 'error');
                          } finally {
                            setSubmittingBulk(false);
                          }
                        }}
                      >
                        {submittingBulk ? 'Sending...' : 'Send Request'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor products to request from */}
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Browse Vendor Products — Request Bulk Quantities</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadBulkData}><RefreshCw className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent>
                  {vendorProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Package2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No vendor products available right now.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vendorProducts.map((vp: any) => (
                        <Card key={vp.id} className="border overflow-hidden">
                          {vp.image_url && <img src={vp.image_url} alt={vp.name} className="w-full h-36 object-cover" />}
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="font-semibold line-clamp-1">{vp.name}</h3>
                              <Badge variant="outline" className="text-xs ml-1 shrink-0">{vp.category_name || 'General'}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">By: {vp.vendor_name}</p>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{vp.description}</p>
                            <p className="text-sm font-semibold text-blue-600 mb-3">Wholesale: ₹{vp.base_price}</p>
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 text-white"
                              onClick={() => setBulkForm({
                                vendorId: vp.vendor_id || 0,
                                vendorName: vp.vendor_name || 'Vendor',
                                productName: vp.name,
                                quantity: '',
                                notes: '',
                              })}
                            >
                              <Package2 className="w-3 h-3 mr-1" /> Request Bulk
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* My bulk requests history */}
              {bulkRequests.length > 0 && (
                <Card className="border-none shadow-md">
                  <CardHeader><CardTitle>My Bulk Requests</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {bulkRequests.map((req: any) => (
                        <div key={req.id} className="p-4 border rounded-xl">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{req.product_name}</p>
                              <p className="text-sm text-gray-500">Vendor: {req.vendor_name} • Qty: {req.quantity}</p>
                              {req.notes && <p className="text-xs text-gray-400 mt-1">Notes: {req.notes}</p>}
                              {req.vendor_response && (
                                <p className="text-xs text-blue-700 mt-1 bg-blue-50 px-2 py-1 rounded">
                                  Vendor: {req.vendor_response}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                            </div>
                            <Badge className={
                              req.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 border-0' :
                              req.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-0' :
                              'bg-yellow-100 text-yellow-700 border-0'
                            }>
                              {req.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        </div>
      </DashboardLayout>
    </>
  );
}
