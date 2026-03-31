import { useNavigate } from 'react-router';
import { LayoutDashboard, ShoppingBag, Heart, History, LogOut, Star, ShoppingCart, CheckCircle, Truck, Package, Bell, X, Search, Plus, Minus, MapPin, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback } from 'react';
import CustomerMap from '../../components/CustomerMap';
import Checkout from '../../components/Checkout';
import BulkOrderPanel from '../../components/BulkOrderPanel';
import { getShopkeeperProducts, getCart, addToCart, removeFromCart, getOrders, updateOrderStatus } from '@/services/api';

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
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop');
  const [showCheckout, setShowCheckout] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBulkOrder, setShowBulkOrder] = useState(false);
  const [vendorData, setVendorData] = useState<any[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'success') =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, o] = await Promise.all([getShopkeeperProducts(), getCart(), getOrders()]);
      console.log('Shopkeeper products:', p);
      console.log('Cart:', c);
      setProducts(Array.isArray(p) ? p : p.results || []);
      setCart(c);
      setOrders(Array.isArray(o) ? o : o.results || []);
    } catch (err) {
      console.error('Load data error:', err);
      showToast('Failed to load data', 'error');
    }
    finally { setLoading(false); }
  }, []);

  const loadVendorData = async () => {
    try {
      const res = await fetch('/api/vendors/with-products/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setVendorData(data);
    } catch (err) {
      console.error('Load vendor data error:', err);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (showBulkOrder) loadVendorData();
  }, [showBulkOrder]);

  const handleAddToCart = async (product: any) => {
    try {
      const result = await addToCart({ product_id: product.id, quantity: 1 });
      console.log('Add to cart result:', result);
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

      {showBulkOrder && (
        <BulkOrderPanel
          vendorData={vendorData}
          onClose={() => setShowBulkOrder(false)}
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
              <Button
                onClick={() => setShowBulkOrder(true)}
                className="mt-4 bg-white text-purple-600 hover:bg-gray-100"
              >
                Make Bulk Order
              </Button>
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
        </div>
      </DashboardLayout>
    </>
  );
}
