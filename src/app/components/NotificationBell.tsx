import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getNotifications, markNotificationsRead } from '@/services/api';

interface Notif { id: number; message: string; is_read: boolean; created_at: string; }

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifs(Array.isArray(data) ? data : data.results || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [load]);

  const unread = notifs.filter(n => !n.is_read).length;

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      try { await markNotificationsRead(); setNotifs(p => p.map(n => ({ ...n, is_read: true }))); }
      catch { /* silent */ }
    }
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
        <Bell className="w-6 h-6 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
          >
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className={`p-4 border-b last:border-0 ${!n.is_read ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifs.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <button onClick={load} className="text-xs text-blue-600 hover:underline">Refresh</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
