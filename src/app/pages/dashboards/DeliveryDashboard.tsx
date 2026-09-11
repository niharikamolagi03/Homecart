import { useNavigate } from 'react-router';
import { LayoutDashboard, MapPin, Package, Clock, LogOut, Navigation, CheckCircle, Bell } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DeliveryMap from '../../components/DeliveryMap';
import { updateDeliveryLocation, getOrders, updateOrderStatus } from '@/services/api';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' | 'warning'; }

const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-yellow-500' }[toast.type];
  return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
      className={`${bg} text-white px-6 py-3 rounded-lg shadow-lg mb-3 flex items-center gap-3 min-w-[300px]`}>
      <Bell className="w-5 h-5" /><span>{toast.message}</span>
    </motion.div>
  );
};

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [location, setLocation] = useState({ lat: 0, lng: 0, address: 'Fetching location...', ready: false });
  const watchRef = useRef<number | null>(null);
  const knownOrderIdsRef = useRef<Set<number> | null>(null);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const refreshOrders = useCallback(async (announceNew = false) => {
    try {
      const data = await getOrders();
      const nextOrders = Array.isArray(data) ? data : data.results || [];
      const nextIds = new Set(nextOrders.map((order: any) => order.id));
      if (announceNew && knownOrderIdsRef.current) {
        nextOrders
          .filter((order: any) => !knownOrderIdsRef.current?.has(order.id))
          .forEach((order: any) => showToast(`New delivery assigned: Order #${order.id}`, 'info'));
      }
      knownOrderIdsRef.current = nextIds;
      setOrders(nextOrders);
    } catch {
      if (!knownOrderIdsRef.current) showToast('Failed to load orders', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    refreshOrders();
    const interval = setInterval(() => refreshOrders(true), 5000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  useEffect(() => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, ready: true });
        try { await updateDeliveryLocation(lat, lng); } catch { /* silent */ }
      },
      () => showToast('Enable location access for delivery tracking', 'warning'),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, [showToast]);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true, onClick: () => {} },
    { icon: LogOut, label: 'Logout', onClick: () => { localStorage.clear(); navigate('/login/delivery'); } },
  ];

  const activeOrders = orders.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED');

  const stats = [
    { title: 'Total Assigned', value: orders.length.toString(), icon: Package },
    { title: 'Active', value: activeOrders.length.toString(), icon: Clock },
    { title: 'Completed', value: deliveredOrders.length.toString(), icon: LayoutDashboard },
  ];

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => <ToastNotification key={t.id} toast={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
        </AnimatePresence>
      </div>

      <DashboardLayout title="Delivery Dashboard" role="Delivery Partner" sidebarItems={sidebarItems}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Banner */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-teal-600 to-blue-600" />
            <div className="relative p-8">
              <h1 className="text-4xl font-bold text-white mb-2">Welcome, {user.name || 'Delivery Partner'}</h1>
              <p className="text-white/90">You have {activeOrders.length} active {activeOrders.length === 1 ? 'delivery' : 'deliveries'}. Stay safe!</p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5 }}>
                <Card className="border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <stat.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Live Map */}
          <Card className="border-none shadow-md mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600 animate-pulse" />
                Live Location Map
                {location.ready && <Badge className="bg-green-100 text-green-700 ml-2">Live</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {location.ready ? (
                <DeliveryMap
                  agentLat={location.lat}
                  agentLng={location.lng}
                  destLat={activeOrders[0]?.latitude ?? undefined}
                  destLng={activeOrders[0]?.longitude ?? undefined}
                  destLabel={activeOrders[0]?.customer_name}
                />
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <p>{location.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Deliveries */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Active Deliveries</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active deliveries assigned to you.</p>
              </div>
            ) : (
              activeOrders.map((order: any, i: number) => (
                  <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="border-none shadow-md">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-purple-100 text-purple-700">#{order.id}</Badge>
                              <Badge variant="outline">{order.status}</Badge>
                              <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">
                                {order.payment_method === 'UPI' ? '📱 UPI' : '💵 COD'}
                              </Badge>
                            </div>
                            <p className="font-semibold text-gray-900">{order.customer?.name || order.customer_name || 'Customer'}</p>
                            <p className="text-gray-600 text-sm mt-0.5">{order.delivery_address}</p>
                            {order.latitude && order.longitude && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> GPS coordinates available
                              </p>
                            )}
                            {/* Order items */}
                            {order.items && order.items.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {order.items.map((item: any) => (
                                  <p key={item.id} className="text-xs text-gray-500">
                                    • {item.product_details?.name || 'Product'} × {item.quantity}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p className="text-sm text-gray-500 mt-2">
                              {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-2xl font-bold text-green-600">₹{order.total_price}</span>
                            <div className="flex gap-2 flex-wrap justify-end">
                              <Button variant="outline" size="sm" onClick={() => {
                                if (location.ready) window.open(`https://www.google.com/maps/dir/${location.lat},${location.lng}/${encodeURIComponent(order.delivery_address)}`, '_blank');
                                else showToast('Location not available', 'warning');
                              }}>
                                <Navigation className="w-4 h-4 mr-1" /> Navigate
                              </Button>
                              {order.status !== 'OUT_FOR_DELIVERY' && (
                                <Button size="sm" className="bg-blue-600 text-white" onClick={async () => {
                                  try {
                                    await updateOrderStatus(order.id, { status: 'OUT_FOR_DELIVERY' });
                                    setOrders(prev => prev.map((o: any) => o.id === order.id ? { ...o, status: 'OUT_FOR_DELIVERY' } : o));
                                    showToast(`Order #${order.id} marked Out for Delivery`);
                                  } catch { showToast('Failed to update status', 'error'); }
                                }}>
                                  <CheckCircle className="w-4 h-4 mr-1" /> Out for Delivery
                                </Button>
                              )}
                              {order.status === 'OUT_FOR_DELIVERY' && (
                                <Button size="sm" className="bg-green-600 text-white" onClick={async () => {
                                  try {
                                    await updateOrderStatus(order.id, { status: 'DELIVERED' });
                                    setOrders(prev => prev.map((o: any) => o.id === order.id ? { ...o, status: 'DELIVERED' } : o));
                                    showToast(`Order #${order.id} delivered! ✅`);
                                  } catch { showToast('Failed to update status', 'error'); }
                                }}>
                                  <CheckCircle className="w-4 h-4 mr-1" /> Mark Delivered
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
