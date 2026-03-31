// pages/About.tsx
import { motion } from 'motion/react';
import { Heart, Lightbulb, Users, TrendingUp, Target, Eye, ShoppingBag, Store, Truck, UserCog } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';

export default function About() {
  const values = [
    {
      icon: Heart,
      title: 'Community First',
      color: 'text-red-500',
      bg: 'bg-red-50',
      desc: 'Every decision we make starts with one question: does this make life easier for the people in our community? Vendors, shopkeepers, delivery partners, and customers — you are the reason HomeCart exists.',
    },
    {
      icon: Lightbulb,
      title: 'Simplicity Over Complexity',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50',
      desc: 'Local commerce is already hard enough. We believe technology should remove friction, not add it. HomeCart is built to be intuitive for everyone — whether you\'re placing your first order or managing a growing shop.',
    },
    {
      icon: TrendingUp,
      title: 'Growth for Everyone',
      color: 'text-green-500',
      bg: 'bg-green-50',
      desc: 'We succeed only when the people on our platform succeed. That means fair pricing, transparent billing, and tools that genuinely help vendors and shopkeepers grow their businesses.',
    },
    {
      icon: Users,
      title: 'Trust Through Transparency',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      desc: 'We don\'t hide behind algorithms or vague policies. Every transaction, every bill, every delivery — it\'s all visible and trackable. Trust is earned through honesty, and we take that seriously.',
    },
  ];

  const roles = [
    { icon: Store, label: 'Vendors', desc: 'List wholesale products and reach shopkeepers who want to resell them.' },
    { icon: UserCog, label: 'Shopkeepers', desc: 'Source products from trusted vendors, set your own prices, and serve your customers.' },
    { icon: ShoppingBag, label: 'Customers', desc: 'Shop from local shopkeepers with real-time delivery tracking.' },
    { icon: Truck, label: 'Delivery Partners', desc: 'Earn by delivering orders with live navigation and status updates.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-4">
            Our Story
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Built for the people who keep local commerce alive
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            HomeCart is a marketplace platform connecting vendors, shopkeepers, customers, and delivery partners — all in one place.
          </motion.p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">

        {/* Why we started */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Why We Started</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-5 leading-snug">
                Local commerce was fragmented. We wanted to fix that.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                We saw a real problem: vendors had products but no easy way to reach shopkeepers. Shopkeepers wanted to stock quality goods but had no structured channel to source them. Customers wanted to buy local but couldn't find a reliable way to do it. And delivery partners had no single platform to manage their work.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                HomeCart was built to connect all four. Not as a giant marketplace that drowns small players, but as a focused platform where every role has a clear purpose and every transaction is transparent.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <Target className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To make local commerce simple, fair, and connected — by giving every participant in the supply chain the tools they need to do their job well.
              </p>
            </div>
          </div>
        </motion.section>

        {/* The problem we solve */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-10 text-white">
            <Eye className="w-10 h-10 text-white/70 mb-4" />
            <h2 className="text-2xl font-bold mb-4">The problem we're solving</h2>
            <p className="text-blue-100 text-lg leading-relaxed mb-4">
              In most local markets, the chain from manufacturer to customer involves too many middlemen, too little visibility, and too much trust placed in informal agreements. A vendor doesn't know which shopkeepers are reliable. A shopkeeper doesn't know if their order will arrive. A customer doesn't know if the product is genuine.
            </p>
            <p className="text-blue-100 text-lg leading-relaxed">
              HomeCart brings structure to this. Every purchase request is tracked. Every approval is recorded. Every delivery is mapped in real time. The whole chain — vendor to shopkeeper to customer to delivery partner — runs through one transparent system.
            </p>
          </div>
        </motion.section>

        {/* Who it's for */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3 text-center">Who It's For</p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Four roles. One platform.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, i) => (
              <motion.div key={role.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all text-center">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                  <role.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{role.label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{role.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Core values */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3 text-center">What We Stand For</p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Our core values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-7 shadow-md hover:shadow-lg transition-all">
                <div className={`w-12 h-12 rounded-xl ${v.bg} flex items-center justify-center mb-4`}>
                  <v.icon className={`w-6 h-6 ${v.color}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-600 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Where we are */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-white rounded-3xl p-10 shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Where we are right now</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            HomeCart is a new platform. We haven't been running for years, and we're not going to pretend otherwise. What we have is a fully built system — vendor management, shopkeeper inventory, customer ordering, live delivery tracking, billing, and real-time notifications — ready to go.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            We're at the beginning of something we believe in deeply. If you're a vendor looking for shopkeepers, a shopkeeper looking for reliable suppliers, or a customer who wants to buy local with confidence — HomeCart was built for you.
          </p>
        </motion.section>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Be part of what we're building</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Whether you're a vendor, shopkeeper, customer, or delivery partner — there's a place for you at HomeCart. Join us and help shape how local commerce works.
          </p>
          <Link to="/roles">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6">
              Get Started
              <Users className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
