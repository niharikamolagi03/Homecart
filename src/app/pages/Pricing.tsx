// pages/Pricing.tsx
import { Link } from 'react-router';
import { CheckCircle, Crown, Star, ArrowRight, Zap, Building, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';

export default function Pricing() {
  const plans = [
    {
      name: 'Basic',
      price: 'Free',
      period: '',
      description: 'Perfect for getting started with our platform',
      icon: Star,
      features: [
        'Basic product listings',
        'Email support',
        'Up to 50 products',
        'Basic analytics',
        'Standard delivery options'
      ],
      popular: false,
      gradient: 'from-gray-500 to-gray-600',
      buttonVariant: 'outline'
    },
    {
      name: 'Professional',
      price: '₹999',
      period: '/month',
      description: 'For growing businesses ready to scale',
      icon: Zap,
      features: [
        'Unlimited product listings',
        'Priority support',
        'Advanced analytics',
        'Featured listings',
        'API access',
        'Promotional tools',
        'Custom branding'
      ],
      popular: true,
      gradient: 'from-blue-500 to-purple-500',
      buttonVariant: 'gradient'
    },
    {
      name: 'Business',
      price: '₹2,499',
      period: '/month',
      description: 'For established businesses with high volume',
      icon: Building,
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        'Custom integrations',
        'White-label solutions',
        '24/7 phone support',
        'Bulk upload tools',
        'Advanced SEO tools'
      ],
      popular: false,
      gradient: 'from-purple-500 to-pink-500',
      buttonVariant: 'outline'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with specific needs',
      icon: Users,
      features: [
        'Custom solutions',
        'SLA guarantees',
        'On-premise deployment',
        'Dedicated infrastructure',
        'Custom training',
        'Priority feature development',
        'Strategic consulting'
      ],
      popular: false,
      gradient: 'from-pink-500 to-rose-500',
      buttonVariant: 'outline'
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
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 max-w-3xl mx-auto"
          >
            Choose the perfect plan for your needs. All plans include basic features to get you started.
          </motion.p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all relative ${
                plan.popular ? 'border-2 border-purple-500 ring-2 ring-purple-200' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6`}>
                  <plan.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="text-gray-600 mb-6 text-sm">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/roles">
                  <Button 
                    className={`w-full ${
                      plan.buttonVariant === 'gradient' 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg' 
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.price === 'Free' ? 'Get Started' : 'Choose Plan'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600">
            Need a custom plan?{' '}
            <Link to="/support" className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact our sales team
            </Link>
            {' '}for enterprise solutions.
          </p>
        </motion.div>
      </div>
    </div>
  );
}