// pages/Support.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, MessageCircle, ChevronDown, ChevronUp, Clock, Headphones, Send, Package, CreditCard, UserPlus, Truck, Shield, Store } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I create an account?',
      answer: 'Click "Get Started" on the homepage and choose your role — Customer, Vendor, Shopkeeper, or Delivery Partner. Fill in your details and submit. Non-customer accounts require admin approval before you can log in.',
      icon: UserPlus,
    },
    {
      question: 'How does the Vendor → Shopkeeper flow work?',
      answer: 'Vendors list wholesale products. Shopkeepers browse and send a purchase request. Once the vendor approves, the shopkeeper sets a selling price and stock quantity to activate the product in their shop.',
      icon: Store,
    },
    {
      question: 'How do I track my order?',
      answer: 'Go to your Customer Dashboard → Orders tab. Active orders show a "Track Live Location" button when the delivery agent is on the way. The map updates in real time using the agent\'s GPS.',
      icon: Package,
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We support Cash on Delivery, UPI (Google Pay, PhonePe, Paytm), and Credit/Debit Cards. Select your preferred method during checkout.',
      icon: CreditCard,
    },
    {
      question: 'How does billing work for shopkeepers?',
      answer: 'When a vendor approves your purchase request, a bill is automatically created with a 7-day due date. You can make full or partial payments from the Billing tab in your Shopkeeper Dashboard.',
      icon: Shield,
    },
    {
      question: 'How do I contact support?',
      answer: 'Use the Live Chat button on this page, email us at support@homecart.com, or call +91 98765 43210. You can also use the Mitra chatbot (bottom-right corner) for instant answers.',
      icon: Headphones,
    },
  ];

  const helpCategories = [
    { title: 'Account & Settings', icon: UserPlus, color: 'from-blue-500 to-cyan-500' },
    { title: 'Orders & Delivery', icon: Package, color: 'from-green-500 to-emerald-500' },
    { title: 'Payments & Billing', icon: CreditCard, color: 'from-purple-500 to-pink-500' },
    { title: 'Vendor & Shopkeeper', icon: Store, color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold mb-4">
            How Can We Help You?
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl text-blue-100 max-w-3xl mx-auto">
            Browse our FAQs or reach out to our support team — we're here 24/7.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Help Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {helpCategories.map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-xl p-4 text-center shadow-md cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setOpenFaq(index)}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mx-auto mb-3`}>
                <category.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{category.title}</span>
            </motion.div>
          ))}
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Mail, color: 'text-blue-600', title: 'Email Us',
              sub: 'support@homecart.com', note: 'Response within 24 hours',
              action: <a href="mailto:support@homecart.com"><Button variant="outline" className="w-full">Send Email <Send className="w-4 h-4 ml-2" /></Button></a>,
            },
            {
              icon: MessageCircle, color: 'text-green-600', title: 'Live Chat',
              sub: 'Chat with our support team', note: 'Available 24/7',
              action: <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">Start Live Chat</Button>,
            },
            {
              icon: Phone, color: 'text-purple-600', title: 'Call Us',
              sub: '+91 98765 43210', note: '9 AM – 9 PM, Mon–Sat',
              action: <a href="tel:+919876543210"><Button variant="outline" className="w-full">Call Now</Button></a>,
            },
          ].map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all text-center">
              <card.icon className={`w-12 h-12 ${card.color} mx-auto mb-4`} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-600 mb-1">{card.sub}</p>
              <p className="text-sm text-gray-500 mb-4">{card.note}</p>
              {card.action}
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <faq.icon className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-base font-semibold text-gray-900 text-left">{faq.question}</span>
                  </div>
                  {openFaq === index ? <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-4">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact Info & Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-2xl p-8 shadow-lg">
            <MapPin className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Office</h3>
            <p className="text-gray-600 mb-4">
              HomeCart Technologies<br />
              123 Tech Park, Electronic City<br />
              Bangalore – 560100, India
            </p>
            <div className="pt-4 border-t border-gray-100 space-y-1">
              <p className="text-sm text-gray-500">📧 support@homecart.com</p>
              <p className="text-sm text-gray-500">📞 +91 98765 43210</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-2xl p-8 shadow-lg">
            <Clock className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Support Hours</h3>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">Live Chat & Mitra Bot</p>
                <p className="text-gray-600">24/7 — Always available</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Phone Support</p>
                <p className="text-gray-600">Mon – Fri: 9 AM – 9 PM</p>
                <p className="text-gray-600">Sat – Sun: 10 AM – 6 PM</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Email Support</p>
                <p className="text-gray-600">Response within 24 hours</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Still need help?</h3>
          <p className="text-gray-600 mb-6">Our team is always ready. You can also try asking <strong>Mitra</strong> — our AI assistant in the bottom-right corner.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <MessageCircle className="w-4 h-4 mr-2" /> Start Live Chat
            </Button>
            <Link to="/roles">
              <Button variant="outline">Get Started with HomeCart</Button>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
