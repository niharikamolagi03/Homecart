import { Link, useNavigate } from 'react-router';
import { ShoppingBag, ChevronDown, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';

const ROLES = [
  { key: 'customer',   label: 'Customer',        emoji: '🛍️', desc: 'Shop and track your orders',          gradient: 'from-blue-500 to-purple-500'  },
  { key: 'vendor',     label: 'Vendor',           emoji: '🏪', desc: 'Manage products and shopkeepers',     gradient: 'from-purple-500 to-pink-500'  },
  { key: 'shopkeeper', label: 'Shopkeeper',       emoji: '🏬', desc: 'Run your shop and manage inventory',  gradient: 'from-cyan-500 to-blue-500'    },
  { key: 'delivery',   label: 'Delivery Partner', emoji: '🚚', desc: 'Manage deliveries and earn',          gradient: 'from-green-500 to-teal-500'   },
  { key: 'admin',      label: 'Admin',            emoji: '🛡️', desc: 'Manage the platform',                 gradient: 'from-orange-500 to-red-500'   },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof ROLES[0] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogin = () => {
    if (selected) navigate(`/login/${selected.key}`);
    else setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <ShoppingBag className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            HomeCart
          </span>
        </Link>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Welcome back</h1>
        <p className="text-gray-500 text-lg">Select your role and sign in to continue</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8"
      >
        {/* Role dropdown trigger */}
        <div ref={dropdownRef} className="relative mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">I am a...</p>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
              selected ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {selected ? (
                <>
                  <span className="text-2xl">{selected.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{selected.label}</p>
                    <p className="text-xs text-gray-500">{selected.desc}</p>
                  </div>
                </>
              ) : (
                <span className="text-gray-400">Select your role</span>
              )}
            </div>
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </button>

          {/* Dropdown */}
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
                    onClick={() => { setSelected(role); setOpen(false); }}
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
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Login button */}
        <Button
          onClick={handleLogin}
          size="lg"
          className={`w-full h-12 rounded-2xl text-white font-semibold transition-all bg-gradient-to-r ${
            selected?.gradient ?? 'from-blue-500 to-purple-600'
          }`}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              Login as {selected.label} <ArrowRight className="w-4 h-4" />
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Login <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>

        <p className="mt-5 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">Register</Link>
        </p>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="mt-8 text-sm text-gray-400">
        <Link to="/" className="hover:text-gray-600 transition-colors">← Back to home</Link>
      </motion.p>
    </div>
  );
}
