// pages/Features.tsx
import { Link } from 'react-router';
import { ShoppingBag, Store, Truck, Shield, Globe, Smartphone, CreditCard, Headphones, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';

export default function Features() {
  const features = [
    {
      icon: Store,
      title: 'Vendor Hub',
      description: 'Powerful tools for vendors to manage inventory, track sales, and grow their business. Get real-time insights and analytics to boost your sales.',
      gradient: 'from-purple-500 to-cyan-500',
      details: ['Inventory management', 'Sales analytics', 'Customer insights', 'Promotion tools']
    },
    {
      icon: Truck,
      title: 'Fast Delivery',
      description: 'Real-time tracking and lightning-fast delivery to your doorstep. Our optimized logistics network ensures your orders reach you quickly and safely.',
      gradient: 'from-cyan-500 to-green-500',
      details: ['Same-day delivery', 'Real-time tracking', 'Scheduled delivery', 'Live location updates']
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Bank-grade security with encrypted transactions and verified sellers. Your data and payments are always protected with advanced encryption.',
      gradient: 'from-green-500 to-blue-500',
      details: ['End-to-end encryption', 'Fraud protection', 'Verified sellers', 'Secure payments']
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      description: 'Available in English, Hindi, and Kannada for better accessibility. We believe in making e-commerce accessible to everyone.',
      gradient: 'from-orange-500 to-red-500',
      details: ['English support', 'Hindi support', 'Kannada support', 'Regional language options']
    },
    {
      icon: Smartphone,
      title: 'Mobile App',
      description: 'Shop on the go with our intuitive mobile application. Download our app for a seamless shopping experience anytime, anywhere.',
      gradient: 'from-indigo-500 to-purple-500',
      details: ['Easy navigation', 'Push notifications', 'Mobile exclusive deals', 'Quick checkout']
    },
    {
      icon: CreditCard,
      title: 'Multiple Payments',
      description: 'UPI, Cards, Net Banking, and Cash on Delivery options. Choose the payment method that works best for you.',
      gradient: 'from-pink-500 to-rose-500',
      details: ['UPI payments', 'Credit/Debit cards', 'Net banking', 'Cash on delivery']
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      description: 'Round-the-clock customer support for all your queries. Our support team is always ready to help you.',
      gradient: 'from-teal-500 to-emerald-500',
      details: ['Live chat support', 'Email support', 'Phone support', '24/7 availability']
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Our Features
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 max-w-3xl mx-auto"
          >
            Discover what makes HomeCart the ultimate marketplace platform
          </motion.p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
            >
              <div className="p-8">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <div className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Link to="/roles">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg px-8 py-6">
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}