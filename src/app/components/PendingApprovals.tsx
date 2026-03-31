import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { getPendingUsers, approveUser, rejectUser } from '@/services/api';

interface PendingUser {
  id: number;
  user: { id: number; name: string; email: string; phone: string; role: string };
  role: string;
  status: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  VENDOR: 'bg-purple-100 text-purple-700',
  SHOPKEEPER: 'bg-cyan-100 text-cyan-700',
  DELIVERY: 'bg-green-100 text-green-700',
};

export default function PendingApprovals() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      const data = await getPendingUsers();
      setPending(Array.isArray(data) ? data : data.results || []);
    } catch {
      setToast('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const handleApprove = async (userId: number, name: string) => {
    try {
      await approveUser(userId);
      setPending(prev => prev.filter(p => p.user.id !== userId));
      setToast(`✅ ${name} approved`);
    } catch { setToast('Failed to approve user'); }
  };

  const handleReject = async (userId: number, name: string) => {
    try {
      await rejectUser(userId);
      setPending(prev => prev.filter(p => p.user.id !== userId));
      setToast(`❌ ${name} rejected`);
    } catch { setToast('Failed to reject user'); }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Pending Approvals
            {pending.length > 0 && (
              <Badge className="bg-red-500 text-white ml-2">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {pending.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl hover:bg-gray-50"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{item.user.name}</p>
                        <Badge className={ROLE_COLORS[item.role] || 'bg-gray-100 text-gray-700'}>
                          {item.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{item.user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Registered: {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(item.user.id, item.user.name)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(item.user.id, item.user.name)}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
