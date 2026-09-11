import { getAdminData, resetMarketplaceData, getPendingUsers, approveUser, rejectUser } from '@/services/api';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, LogOut,
  Shield, Settings, Database,
  AlertTriangle, CheckCircle, XCircle, Search,
  ChevronDown, Crown, UserCheck, UserMinus, Bell,
  RefreshCw, UserCog, Store, Truck, ShoppingCart, Trash2
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' }[toast.type];
  return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
      className={`${bg} text-white px-6 py-3 rounded-lg shadow-lg mb-3 flex items-center gap-3 min-w-[300px]`}>
      {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
      {toast.type === 'error' && <XCircle className="w-5 h-5" />}
      {toast.type === 'info' && <Bell className="w-5 h-5" />}
      <span>{toast.message}</span>
    </motion.div>
  );
};

// ── Access Control reference — all 5 roles ────────────────────────────────────
const ROLE_ACCESS = [
  {
    role: 'Admin',
    icon: Crown,
    color: 'text-red-600',
    badge: 'Full Access',
    badgeClass: 'bg-red-100 text-red-700',
    permissions: [
      'Approve / reject user registrations',
      'Manage all users (suspend, delete, reset password)',
      'View all orders, products, billing records',
      'Reset marketplace data',
      'Access system configuration',
    ],
  },
  {
    role: 'Vendor',
    icon: Store,
    color: 'text-blue-600',
    badge: 'Vendor Access',
    badgeClass: 'bg-blue-100 text-blue-700',
    permissions: [
      'Create, edit, delete own wholesale products',
      'View and manage purchase requests from shopkeepers',
      'Approve or reject shopkeeper requests',
      'View billing records and pending revenue',
      'View orders containing their products',
    ],
  },
  {
    role: 'Shopkeeper',
    icon: UserCog,
    color: 'text-cyan-600',
    badge: 'Shopkeeper Access',
    badgeClass: 'bg-cyan-100 text-cyan-700',
    permissions: [
      'Browse vendor products and send purchase requests',
      'Set selling price and stock after vendor approval',
      'Manage own shop products',
      'View and pay billing records',
      'Accept and manage customer orders',
    ],
  },
  {
    role: 'Customer',
    icon: ShoppingCart,
    color: 'text-green-600',
    badge: 'Customer Access',
    badgeClass: 'bg-green-100 text-green-700',
    permissions: [
      'Browse active shopkeeper products',
      'Add products to cart',
      'Place orders with UPI / Card / Cash on Delivery',
      'Track live order location',
      'View order history',
    ],
  },
  {
    role: 'Delivery Partner',
    icon: Truck,
    color: 'text-orange-600',
    badge: 'Delivery Access',
    badgeClass: 'bg-orange-100 text-orange-700',
    permissions: [
      'View orders assigned to them',
      'Update order status (Out for Delivery → Delivered)',
      'Share live GPS location for customer tracking',
      'Navigate to delivery address via map',
    ],
  },
];

// ── Security Component ────────────────────────────────────────────────────────
const SecurityComponent = ({ maintenanceMode, onToggleMaintenance, showToast }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Security & Access Control</h2>

    {/* Working policy — maintenance mode only */}
    <Card>
      <CardHeader><CardTitle>System Policies</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center py-2">
          <div>
            <p className="font-medium text-gray-900">Maintenance Mode</p>
            <p className="text-sm text-gray-500">Temporarily disable the platform for all users</p>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={onToggleMaintenance} />
        </div>
        <div className="border-t pt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          <p className="font-medium text-gray-700 mb-1">Authentication</p>
          <p>JWT-based authentication with access + refresh tokens. Tokens are blacklisted on logout. Non-customer accounts require admin approval before first login.</p>
        </div>
      </CardContent>
    </Card>

    {/* Access Control — all 5 roles */}
    <Card>
      <CardHeader><CardTitle>Role-Based Access Control</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ROLE_ACCESS.map(r => (
            <div key={r.role} className="p-4 border rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                  <span className="font-semibold text-gray-900">{r.role}</span>
                </div>
                <Badge className={`${r.badgeClass} border-0`}>{r.badge}</Badge>
              </div>
              <ul className="space-y-1">
                {r.permissions.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ── KYC Summary Card — clean, no raw JSON ─────────────────────────────────
const KYCSummary = ({ user }: { user: any }) => {
  const score = user?.kyc_score;
  const decision = user?.kyc_decision;

  let report: any = null;
  try { report = user?.classification_report ? JSON.parse(user.classification_report) : null; } catch {}

  const docValid = report?.document_validated ?? false;
  const authScore = report?.authenticity_score ?? 0;
  const selfieValid = report?.validation_details?.selfie?.is_valid ?? false;
  const idValid = report?.validation_details?.id?.is_valid ?? false;
  const redFlags = (report?.red_flags || []).filter((f: string) => !f.includes(':'));
  const verdict = report?.final_verdict?.replace(/[✓✗]/g, '').trim() || '—';

  const overallOk = docValid && selfieValid && idValid && (score ?? 0) >= 0.9;
  const overallWarn = !overallOk && (score ?? 0) >= 0.8;

  return (
    <div className="space-y-3">
      {/* Overall verdict banner */}
      <div className={`flex items-center gap-3 p-3 rounded-xl ${
        overallOk ? 'bg-green-50 border border-green-200' :
        overallWarn ? 'bg-yellow-50 border border-yellow-200' :
        'bg-red-50 border border-red-200'
      }`}>
        {overallOk
          ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          : overallWarn
          ? <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
          : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
        <div>
          <p className={`font-semibold text-sm ${overallOk ? 'text-green-800' : overallWarn ? 'text-yellow-800' : 'text-red-800'}`}>
            {overallOk ? 'Identity Verified' : overallWarn ? 'Requires Manual Review' : 'Verification Failed'}
          </p>
          <p className={`text-xs mt-0.5 ${overallOk ? 'text-green-700' : overallWarn ? 'text-yellow-700' : 'text-red-700'}`}>
            {overallOk
              ? 'Document and selfie checks passed. Safe to approve.'
              : overallWarn
              ? 'Some checks have lower confidence. Review documents before approving.'
              : 'One or more verification checks failed. Review carefully.'}
          </p>
        </div>
      </div>

      {/* Score grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Identity Score', value: score != null ? `${(score * 100).toFixed(0)}%` : '—', ok: (score ?? 0) >= 0.9 },
          { label: 'Document Auth', value: `${authScore}%`, ok: authScore >= 80 },
          { label: 'Decision', value: decision ? (decision === 'REAL' ? 'Genuine' : 'Suspicious') : '—', ok: decision === 'REAL' },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 border rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`font-bold text-sm ${item.ok ? 'text-green-700' : 'text-red-600'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Document checks */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Selfie', ok: selfieValid },
          { label: 'ID Document', ok: idValid },
          { label: 'Document Validated', ok: docValid },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border rounded-lg">
            {item.ok
              ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            <span className="text-xs text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Red flags — only if any */}
      {redFlags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {redFlags.map((flag: string, i: number) => (
            <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">{flag}</span>
          ))}
        </div>
      )}

      {/* Verdict note */}
      {verdict !== '—' && (
        <p className="text-xs text-gray-500 bg-gray-50 border rounded-lg p-2">{verdict}</p>
      )}
    </div>
  );
};
const UserManagementComponent = ({ users, loading, onApprove, onReject, searchTerm, setSearchTerm, roleFilter, setRoleFilter }: any) => {
  const filtered = users.filter((u: any) => {
    const matchSearch = u.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role?.toLowerCase() === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by name or email..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No pending approvals.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filtered.map((req: any) => (
                <Card key={req.id} className="border-gray-200 shadow-sm">
                  <CardContent className="p-5 space-y-4">

                    {/* Header — name, role, status, date */}
                    <div className="flex justify-between items-start flex-wrap gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{req.user?.name}</h3>
                        <p className="text-sm text-gray-500">{req.user?.email}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-700 border-0 capitalize">{req.role}</Badge>
                          <Badge className={
                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-0' :
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-700 border-0' :
                            'bg-red-100 text-red-700 border-0'
                          }>{req.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Applied: {req.created_at ? new Date(req.created_at).toLocaleString() : '--'}
                        </p>
                      </div>
                    </div>

                    {/* ID photos */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded-xl overflow-hidden">
                        <p className="text-xs font-medium px-3 py-1.5 bg-gray-50 text-gray-600">Selfie</p>
                        {req.user?.profile_image
                          ? <img src={req.user.profile_image} alt="Selfie" className="w-full h-40 object-cover" />
                          : <div className="h-40 flex items-center justify-center text-gray-400 text-sm bg-gray-50">Not provided</div>}
                      </div>
                      <div className="border rounded-xl overflow-hidden">
                        <p className="text-xs font-medium px-3 py-1.5 bg-gray-50 text-gray-600">ID Document</p>
                        {req.user?.id_document
                          ? <img src={req.user.id_document} alt="ID Document" className="w-full h-40 object-cover" />
                          : <div className="h-40 flex items-center justify-center text-gray-400 text-sm bg-gray-50">Not provided</div>}
                      </div>
                    </div>

                    {/* KYC Summary — clean, no raw JSON */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">KYC Verification</p>
                      <KYCSummary user={req.user} />
                    </div>

                    {/* Action buttons */}
                    {req.status === 'PENDING' && (
                      <div className="flex gap-3 pt-1">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1" onClick={() => onApprove(req.user?.id, req.user?.name)}>
                          <UserCheck className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 flex-1" onClick={() => onReject(req.user?.id, req.user?.name)}>
                          <UserMinus className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Data Management Component ─────────────────────────────────────────────────
const DataManagementComponent = ({ showToast }: any) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const result = await resetMarketplaceData();
      showToast(`✅ Reset complete. Deleted: ${Object.values(result.deleted).reduce((a: any, b: any) => a + b, 0)} records.`, 'success');
      setConfirmReset(false);
    } catch (err: any) {
      showToast(err.message || 'Reset failed', 'error');
    } finally { setResetting(false); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone — Reset Marketplace Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-700">
            Permanently deletes all products, orders, cart items, billing records, purchase requests, and notifications.
            User accounts are <strong>not</strong> affected.
          </p>
          {!confirmReset ? (
            <Button variant="outline" className="border-red-400 text-red-700 hover:bg-red-100" onClick={() => setConfirmReset(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Reset All Marketplace Data
            </Button>
          ) : (
            <div className="p-4 border border-red-300 rounded-xl bg-white space-y-3">
              <p className="font-semibold text-red-800">⚠ Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={resetting} onClick={handleReset}>
                  {resetting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : <><Trash2 className="w-4 h-4 mr-2" />Yes, Delete Everything</>}
                </Button>
                <Button variant="outline" onClick={() => setConfirmReset(false)} disabled={resetting}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('Admin');
  const [activePage, setActivePage] = useState('overview');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const showToast = (message: string, type: Toast['type'] = 'success') =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);

  const loadPendingUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getPendingUsers();
      setPendingUsers(Array.isArray(data) ? data : data.results || []);
    } catch { /* silent */ }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => {
    getAdminData().then(d => setAdminName(d.name || d.full_name || 'Admin')).catch(() => {});
    loadPendingUsers();
  }, [loadPendingUsers]);

  const handleApprove = async (userId: number, name: string) => {
    try {
      await approveUser(userId);
      setPendingUsers(prev => prev.map(u => u.user?.id === userId ? { ...u, status: 'APPROVED' } : u));
      showToast(`✅ ${name} approved`);
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleReject = async (userId: number, name: string) => {
    try {
      await rejectUser(userId);
      setPendingUsers(prev => prev.map(u => u.user?.id === userId ? { ...u, status: 'REJECTED' } : u));
      showToast(`${name} rejected`, 'info');
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const pendingCount = pendingUsers.filter(u => u.status === 'PENDING').length;

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Overview', active: activePage === 'overview', onClick: () => setActivePage('overview') },
    { icon: Users, label: `Approvals${pendingCount > 0 ? ` (${pendingCount})` : ''}`, active: activePage === 'users', onClick: () => setActivePage('users') },
    { icon: Shield, label: 'Security & Access', active: activePage === 'security', onClick: () => setActivePage('security') },
    { icon: Database, label: 'Data Management', active: activePage === 'data', onClick: () => setActivePage('data') },
    { icon: LogOut, label: 'Logout', onClick: () => { localStorage.clear(); navigate('/login'); } },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'users':
        return (
          <UserManagementComponent
            users={pendingUsers}
            loading={loadingUsers}
            onApprove={handleApprove}
            onReject={handleReject}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            showToast={showToast}
          />
        );
      case 'security':
        return (
          <SecurityComponent
            maintenanceMode={maintenanceMode}
            onToggleMaintenance={() => {
              setMaintenanceMode(m => !m);
              showToast(maintenanceMode ? '✅ Maintenance mode disabled' : '🔧 Maintenance mode enabled', 'info');
            }}
            showToast={showToast}
          />
        );
      case 'data':
        return <DataManagementComponent showToast={showToast} />;
      default:
        return (
          <div className="space-y-6">
            {/* Stats from real data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Approvals</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pendingCount > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                    <Users className={`w-6 h-6 ${pendingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Maintenance Mode</p>
                    <p className="text-3xl font-bold text-gray-900">{maintenanceMode ? 'ON' : 'OFF'}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${maintenanceMode ? 'bg-red-100' : 'bg-green-100'}`}>
                    <Settings className={`w-6 h-6 ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Roles Supported</p>
                    <p className="text-3xl font-bold text-gray-900">5</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={() => setActivePage('users')} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Users className="w-4 h-4 mr-2" /> Review Approvals {pendingCount > 0 && `(${pendingCount})`}
              </Button>
              <Button variant="outline" onClick={() => setActivePage('security')}>
                <Shield className="w-4 h-4 mr-2" /> Security & Access Control
              </Button>
              <Button variant="outline" onClick={() => setActivePage('data')}>
                <Database className="w-4 h-4 mr-2" /> Data Management
              </Button>
            </div>

            {/* Pending approvals preview */}
            {pendingCount > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> {pendingCount} user{pendingCount > 1 ? 's' : ''} awaiting approval
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingUsers.filter(u => u.status === 'PENDING').slice(0, 3).map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                        <div>
                          <p className="font-medium text-gray-900">{req.user?.name}</p>
                          <p className="text-sm text-gray-500">{req.user?.email} • <span className="capitalize">{req.role}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 text-white" onClick={() => handleApprove(req.user?.id, req.user?.name)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleReject(req.user?.id, req.user?.name)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pendingCount > 3 && (
                    <Button variant="ghost" className="w-full mt-3 text-yellow-700" onClick={() => setActivePage('users')}>
                      View all {pendingCount} pending approvals <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => <ToastNotification key={t.id} toast={t} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
        </AnimatePresence>
      </div>

      <DashboardLayout title="Admin Dashboard" role="Administrator" sidebarItems={sidebarItems}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Banner */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
            <div className="relative p-8 flex justify-between items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-3">
                  <Shield className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">Administrator Access</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-1">Welcome, {adminName}</h1>
                <p className="text-white/80">Manage users, approvals, and system settings.</p>
              </div>
              <Crown className="w-24 h-24 text-white/20 hidden md:block" />
            </div>
          </motion.div>

          {/* Maintenance banner */}
          <AnimatePresence>
            {maintenanceMode && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-800">Maintenance Mode is Active</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setMaintenanceMode(false); showToast('Maintenance mode disabled', 'info'); }}>
                  Disable
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {renderPage()}
        </div>
      </DashboardLayout>
    </>
  );
}
