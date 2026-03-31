import { useNavigate } from 'react-router';
import {
  LayoutDashboard, MapPin, Package, TrendingUp,
  Clock, LogOut, Navigation, CheckCircle, Phone, Star,
  Bell, AlertTriangle, IndianRupee
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useState, useEffect, useRef } from 'react';
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

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };

  useEffect(() => {
    getOrders()
      .then(data => setOrders(Array.isArray(data) ? data : data.results || []))
      .catch(() => showToast('Failed to load orders', 'error'));
  }, []);

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
  }, []);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true, onClick: () => {} },
    { icon: Package, label: 'Deliveries', onClick: () => showToast('Viewing deliveries', 'info') },
    { icon: MapPin, label: 'Routes', onClick: () => showToast('Optimizing routes', 'info') },
    { icon: IndianRupee, label: 'Earnings', onClick: () => showToast('Viewing earnings', 'info') },
    { icon: LogOut, label: 'Logout', onClick: () => {
      localStorage.clear();
      navigate('/login/delivery');
    }},
  ];

  const stats = [
    { title: "Today's Earnings", value: '₹0', change: '', icon: IndianRupee },
    { title: 'Deliveries', value: orders.length.toString(), change: '', icon: Package },
    { title: 'Active Orders', value: orders.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length.toString(), change: 'Pending', icon: Clock },
    { title: 'Rating', value: '4.8', change: '⭐', icon: TrendingUp },
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
              <p className="text-white/90">You have {orders.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length} active deliveries. Stay safe!</p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5 }}>
                <Card className="border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <stat.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                      <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                    </div>
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
                  destLat={orders[0] ? location.lat + 0.01 : undefined}
                  destLng={orders[0] ? location.lng + 0.01 : undefined}
                  destLabel={orders[0]?.customer_name}
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
            {orders.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active deliveries assigned to you.</p>
              </div>
            ) : (
              orders
                .filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
                .map((order: any, i: number) => (
                  <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="border-none shadow-md">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-purple-100 text-purple-700">#{order.id}</Badge>
                              <Badge variant="outline">{order.status}</Badge>
                            </div>
                            <p className="font-semibold text-gray-900">{order.customer_name || 'Customer'}</p>
                            <p className="text-gray-600 text-sm">{order.delivery_address}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              ₹{order.total_price} • {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-2xl font-bold text-green-600">₹{order.total_price}</span>
                            <div className="flex gap-2">
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
