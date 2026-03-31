import { Link, useNavigate, useParams } from 'react-router';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES = [
  { key: 'CUSTOMER',    label: 'Customer',         emoji: '🛍️', desc: 'Shop and track your orders',           gradient: 'from-blue-500 to-purple-500',   route: '/dashboard/customer'   },
  { key: 'VENDOR',      label: 'Vendor',            emoji: '🏪', desc: 'Manage products and shopkeepers',      gradient: 'from-purple-500 to-pink-500',    route: '/dashboard/vendor'     },
  { key: 'SHOPKEEPER',  label: 'Shopkeeper',        emoji: '🏬', desc: 'Run your shop and manage inventory',   gradient: 'from-cyan-500 to-blue-500',      route: '/dashboard/shopkeeper' },
  { key: 'DELIVERY',    label: 'Delivery Partner',  emoji: '🚚', desc: 'Manage deliveries and earn',           gradient: 'from-green-500 to-teal-500',     route: '/dashboard/delivery'   },
  { key: 'ADMIN',       label: 'Admin',             emoji: '🛡️', desc: 'Manage the platform',                  gradient: 'from-orange-500 to-red-500',     route: '/dashboard/admin'      },
];

// ── Animated role badge ───────────────────────────────────────────────────────
function RoleBadge({ role }: { role: typeof ROLES[0] }) {
  return (
    <motion.div
      key={role.key}
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${role.gradient} text-white text-sm font-medium`}
    >
      <span>{role.emoji}</span>
      <span>{role.label}</span>
    </motion.div>
  );
}

// ── Custom role dropdown ──────────────────────────────────────────────────────
function RoleDropdown({ selected, onSelect }: { selected: typeof ROLES[0] | null; onSelect: (r: typeof ROLES[0]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
          selected ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <span className="text-xl">{selected.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selected.label}</p>
                <p className="text-xs text-gray-500">{selected.desc}</p>
              </div>
            </>
          ) : (
            <span className="text-gray-400 text-sm">I am a...</span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {ROLES.map(role => (
              <button
                key={role.key}
                type="button"
                onClick={() => { onSelect(role); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                  selected?.key === role.key ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-xl w-8 text-center">{role.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{role.label}</p>
                  <p className="text-xs text-gray-500">{role.desc}</p>
                </div>
                {selected?.key === role.key && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoleLogin() {
  const { role: roleParam } = useParams<{ role?: string }>();
  const navigate = useNavigate();

  // Pre-select role from URL param if provided
  const initialRole = roleParam ? ROLES.find(r => r.key === roleParam.toUpperCase()) ?? null : null;

  const [selectedRole, setSelectedRole] = useState<typeof ROLES[0] | null>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) { setError('Please select your role to continue.'); return; }
    setError('');
    setLoading(true);

    try {
      const { loginUser } = await import('@/services/api');
      const data = await loginUser({ email, password, role: selectedRole.key });

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));

      const userRole = data.user?.role?.toLowerCase();
      const roleRoutes: Record<string, string> = {
        admin: '/dashboard/admin', vendor: '/dashboard/vendor',
        customer: '/dashboard/customer', delivery: '/dashboard/delivery',
        shopkeeper: '/dashboard/shopkeeper',
      };
      navigate(roleRoutes[userRole] || '/');
    } catch (err: any) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const activeGradient = selectedRole?.gradient ?? 'from-blue-500 to-purple-600';

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — decorative ── */}
      <motion.div
        className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${activeGradient} relative overflow-hidden flex-col justify-between p-12`}
        animate={{ background: undefined }}
        transition={{ duration: 0.4 }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          ))}
        </div>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">HomeCart</span>
        </Link>

        {/* Role illustration */}
        <div className="relative z-10 text-center">
          <AnimatePresence mode="wait">
            {selectedRole ? (
              <motion.div key={selectedRole.key} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }}>
                <div className="text-8xl mb-6">{selectedRole.emoji}</div>
                <h2 className="text-3xl font-bold text-white mb-3">{selectedRole.label}</h2>
                <p className="text-white/80 text-lg">{selectedRole.desc}</p>
              </motion.div>
            ) : (
              <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-8xl mb-6">🏪</div>
                <h2 className="text-3xl font-bold text-white mb-3">Welcome back</h2>
                <p className="text-white/80 text-lg">Select your role and sign in to continue</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom tagline */}
        <p className="text-white/60 text-sm relative z-10">
          Connecting vendors, shopkeepers, customers & delivery partners.
        </p>
      </motion.div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">

          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HomeCart</span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
            <p className="text-gray-500">
              {selectedRole ? (
                <span className="flex items-center gap-2">
                  Signing in as <AnimatePresence mode="wait"><RoleBadge key={selectedRole.key} role={selectedRole} /></AnimatePresence>
                </span>
              ) : 'Select your role and enter your credentials.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Role dropdown */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">I am a...</Label>
              <RoleDropdown selected={selectedRole} onSelect={r => { setSelectedRole(r); setError(''); }} />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl border-gray-200" required />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-11 rounded-xl border-gray-200" required />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button type="submit" disabled={loading || !selectedRole} size="lg"
              className={`w-full h-12 rounded-xl text-white font-semibold transition-all bg-gradient-to-r ${activeGradient} disabled:opacity-50`}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : selectedRole ? `Sign in as ${selectedRole.label}` : 'Select a role to continue'}
            </Button>
          </form>

          {/* Register */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">Create one</Link>
          </p>

          {/* Back to roles */}
          <p className="mt-3 text-center text-xs text-gray-400">
            <Link to="/roles" className="hover:text-gray-600 transition-colors">← Back to role selection</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
