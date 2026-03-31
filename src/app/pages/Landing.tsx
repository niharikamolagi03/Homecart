// pages/Landing.tsx
import { Link, useNavigate } from 'react-router';
import { 
  ShoppingBag, Store, Truck, Shield, Users, MapPin, TrendingUp, Star, 
  ArrowRight, CheckCircle, Sparkles, Zap, Award, Globe, CreditCard, 
  Headphones, ShoppingCart, Package, BarChart, Clock, Heart, 
  Play, ChevronRight, Github, Twitter, Facebook, Instagram, Mail,
  Phone, MapPin as MapPinIcon, ShieldCheck, X, Crown, Gift, Rocket
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

// Toast Notification Component
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastNotification = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  setTimeout(onClose, 3000);
  
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[toast.type];

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg mb-3 flex items-center gap-3 min-w-[300px] z-50`}
    >
      {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
      {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
      {toast.type === 'info' && <Bell className="w-5 h-5" />}
      <span>{toast.message}</span>
    </motion.div>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const features = [
    {
      title: 'Vendor Hub',
      description: 'Powerful tools for vendors to manage inventory, track sales, and grow their business.',
      icon: Store,
      gradient: 'from-purple-500 to-cyan-500',
      benefits: ['Inventory management', 'Sales analytics', 'Customer insights'],
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    },
    {
      title: 'Fast Delivery',
      description: 'Real-time tracking and lightning-fast delivery to your doorstep.',
      icon: Truck,
      gradient: 'from-cyan-500 to-green-500',
      benefits: ['Same-day delivery', 'Real-time tracking', 'Scheduled delivery'],
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop',
    },
    {
      title: 'Secure Platform',
      description: 'Bank-grade security with encrypted transactions and verified sellers.',
      icon: Shield,
      gradient: 'from-green-500 to-blue-500',
      benefits: ['End-to-end encryption', 'Fraud protection', 'Verified sellers'],
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
    },
  ];

  const benefits = [
    { icon: Crown, title: 'Exclusive Rewards', description: 'Earn points on every purchase and unlock special privileges', color: 'from-yellow-500 to-amber-500' },
    { icon: Gift, title: 'Birthday Bonuses', description: 'Get special gifts and discounts on your special day', color: 'from-pink-500 to-rose-500' },
    { icon: Rocket, title: 'Early Access', description: 'Be the first to try new features and products', color: 'from-purple-500 to-indigo-500' },
  ];

  return (
    <>
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastNotification key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center gap-2 group">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                </motion.div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  HomeCart
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link to="/features" onClick={() => showToast('Explore our features', 'info')}>
                  <span className="text-gray-600 hover:text-gray-900 transition-colors">Features</span>
                </Link>
                <Link to="/about" onClick={() => showToast('Learn about us', 'info')}>
                  <span className="text-gray-600 hover:text-gray-900 transition-colors">About</span>
                </Link>
                <Link to="/support" onClick={() => showToast('How can we help?', 'info')}>
                  <span className="text-gray-600 hover:text-gray-900 transition-colors">Support</span>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/register">
                  <Button variant="outline">Register</Button>
                </Link>
                <Link to="/roles">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section with Background Image */}
        <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&h=600&fit=crop" 
              alt="Shopping"
              className="w-full h-full object-cover opacity-10"
            />
          </div>
          <div className="max-w-7xl mx-auto relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2 mb-6"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Welcome to the future of marketplace</span>
              </motion.div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent animate-gradient">
                  HomeCart
                </span>
              </h1>
              
              <motion.p 
                className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 max-w-3xl mx-auto"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                Where every purchase meets a dream
                <motion.span
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.2, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="inline-block ml-2"
                >
                  💫
                </motion.span>
              </motion.p>
              
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Your Marketplace Revolution - Connect, Shop, Sell, and Deliver with ease
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/roles">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg px-8 py-6 shadow-xl">
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/register">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                      Create Account
                      <Users className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </Link>
              </div>

              {/* Role Sign In Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-10"
              >
                <p className="text-gray-500 text-sm mb-4">Sign in as:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { label: 'Admin', emoji: '👨‍💼', role: 'admin', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                    { label: 'Vendor', emoji: '🏪', role: 'vendor', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                    { label: 'Shopkeeper', emoji: '🏬', role: 'shopkeeper', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
                    { label: 'Customer', emoji: '🛍️', role: 'customer', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                    { label: 'Delivery', emoji: '🚚', role: 'delivery', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                  ].map((r) => (
                    <Link key={r.role} to={`/login/${r.role}`}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm cursor-pointer transition-colors ${r.color}`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.label}</span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 flex flex-wrap justify-center gap-6"
              >
                {[
                  { icon: ShieldCheck, text: 'Secure Payments' },
                  { icon: Clock, text: '24/7 Support' },
                  { icon: Award, text: 'Trusted Platform' },
                ].map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-600">
                    <badge.icon className="w-5 h-5 text-green-500" />
                    <span className="text-sm">{badge.text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section with Images */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Everything You Need in One Place
              </h2>
              <p className="text-xl text-gray-600">
                Powerful features designed for every user type
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
                  onClick={() => showToast(`Learn more about ${feature.title}`, 'info')}
                >
                  <div className="h-48 overflow-hidden">
                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Join Our Community
              </h2>
              <p className="text-xl text-gray-600">
                Become part of something extraordinary
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-2xl p-8 shadow-xl text-center group cursor-pointer"
                  onClick={() => showToast(`Learn more about ${benefit.title}`, 'info')}
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${benefit.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                    <benefit.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl"
            >
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=400&fit=crop" 
                  alt="Community"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90" />
              </div>
              <div className="relative z-10 p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-6 text-white/80" />
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Join Our Happy Members
                </h2>
                <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                  Be part of India's fastest growing marketplace community. Connect with shoppers, vendors, and delivery partners across the nation.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/roles">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="bg-white text-purple-600 text-lg px-8 py-6 shadow-xl hover:shadow-2xl font-semibold">
                        Join Now
                        <Users className="w-5 h-5 ml-2" />
                      </Button>
                    </motion.div>
                  </Link>
                  <Button 
                    size="lg" 
                    className="bg-white/20 backdrop-blur-sm text-white border-2 border-white text-lg px-8 py-6 hover:bg-white/30 transition-all font-semibold"
                    onClick={() => showToast('Learn more about our community', 'info')}
                  >
                    Learn More
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-8 h-8 text-blue-400" />
                  <span className="text-xl font-bold">HomeCart</span>
                </div>
                <p className="text-gray-400 text-sm">Where every purchase meets a dream 💫</p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link to="/about" onClick={() => showToast('Learn about us', 'info')} className="hover:text-white transition-colors">About Us</Link></li>
                  <li><Link to="/features" onClick={() => showToast('Explore features', 'info')} className="hover:text-white transition-colors">Features</Link></li>
                  <li><Link to="/support" onClick={() => showToast('Contact us', 'info')} className="hover:text-white transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><Link to="/help" onClick={() => showToast('Help center', 'info')} className="hover:text-white transition-colors">Help Center</Link></li>
                  <li><Link to="/terms" onClick={() => showToast('Terms and conditions', 'info')} className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link to="/privacy" onClick={() => showToast('Privacy policy', 'info')} className="hover:text-white transition-colors">Privacy Policy</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Contact Info</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@homecart.com</li>
                  <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91 98765 43210</li>
                  <li className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /> 123 Tech Park, Bangalore, India</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">&copy; 2026 HomeCart. All rights reserved.</p>
              <div className="flex gap-4">
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" onClick={() => showToast('Follow us on Twitter', 'info')} />
                <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" onClick={() => showToast('Follow us on Facebook', 'info')} />
                <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" onClick={() => showToast('Follow us on Instagram', 'info')} />
                <Github className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" onClick={() => showToast('Check our GitHub', 'info')} />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// Helper component for missing icons
const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Bell = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);