import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShoppingBag, Menu, Bell, User, LogOut, Search, Play, X, ChevronRight, Sparkles, Star, Zap, Settings, HelpCircle, Moon, Sun, Volume2, VolumeX, Info, Globe, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: string;
  sidebarItems: Array<{
    icon: React.ElementType;
    label: string;
    href?: string;
    active?: boolean;
    onClick?: () => void;
  }>;
}

type Language = 'english' | 'hindi' | 'kannada';

// Floating particles component for background
const FloatingParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Animated gradient orb
const AnimatedOrb = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const x = useTransform(springX, (value) => value / 20);
  const y = useTransform(springY, (value) => value / 20);

  return (
    <motion.div
      className="fixed -top-1/2 -right-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-3xl pointer-events-none"
      style={{ x, y }}
    />
  );
};

// Notifications Dropdown Component — replaced with real NotificationBell

// Know More Modal Component with Multi-language Support
const KnowMoreModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [languageOpen, setLanguageOpen] = useState(false);

  const content = {
    english: {
      title: "About HomeCart",
      sections: [
        {
          heading: "Welcome to HomeCart",
          text: "HomeCart is your one-stop destination for all your shopping needs. We bring you the best products from trusted sellers across India, delivered right to your doorstep."
        },
        {
          heading: "Our Mission",
          text: "To revolutionize the online shopping experience by providing a seamless, secure, and enjoyable platform where customers can discover and purchase products with confidence."
        },
        {
          heading: "Key Features",
          points: [
            "Wide range of products across multiple categories",
            "Secure payment gateway with multiple options",
            "Real-time order tracking",
            "Easy returns and refunds",
            "24/7 customer support",
            "Personalized recommendations"
          ]
        },
        {
          heading: "Why Choose HomeCart?",
          text: "We prioritize customer satisfaction above everything else. With our user-friendly interface, competitive prices, and reliable delivery network, we ensure that your shopping experience is nothing short of excellent."
        },
        {
          heading: "Get Started",
          text: "Browse through our extensive collection, add items to your cart, and checkout securely. Your first order comes with free shipping!"
        }
      ]
    },
    hindi: {
      title: "होमकार्ट के बारे में",
      sections: [
        {
          heading: "होमकार्ट में आपका स्वागत है",
          text: "होमकार्ट आपकी सभी शॉपिंग जरूरतों के लिए आपका एक-स्टॉप गंतव्य है। हम आपको भारत भर के विश्वसनीय विक्रेताओं से सर्वोत्तम उत्पाद लाते हैं, जो सीधे आपके दरवाजे पर पहुंचाए जाते हैं।"
        },
        {
          heading: "हमारा मिशन",
          text: "एक सहज, सुरक्षित और आनंददायक प्लेटफॉर्म प्रदान करके ऑनलाइन शॉपिंग अनुभव में क्रांतिकारी बदलाव लाना, जहां ग्राहक आत्मविश्वास के साथ उत्पादों को खोज और खरीद सकें।"
        },
        {
          heading: "प्रमुख विशेषताएं",
          points: [
            "कई श्रेणियों में उत्पादों की विस्तृत श्रृंखला",
            "कई विकल्पों के साथ सुरक्षित भुगतान गेटवे",
            "रीयल-टाइम ऑर्डर ट्रैकिंग",
            "आसान रिटर्न और रिफंड",
            "24/7 ग्राहक सहायता",
            "व्यक्तिगत सिफारिशें"
          ]
        },
        {
          heading: "होमकार्ट क्यों चुनें?",
          text: "हम सबसे ऊपर ग्राहकों की संतुष्टि को प्राथमिकता देते हैं। हमारे उपयोगकर्ता-अनुकूल इंटरफेस, प्रतिस्पर्धी कीमतों और विश्वसनीय डिलीवरी नेटवर्क के साथ, हम सुनिश्चित करते हैं कि आपका शॉपिंग अनुभव उत्कृष्टता से कम न हो।"
        },
        {
          heading: "शुरू करें",
          text: "हमारे विशाल संग्रह को ब्राउज़ करें, आइटम को अपने कार्ट में जोड़ें, और सुरक्षित रूप से चेकआउट करें। आपका पहला ऑर्डर मुफ्त शिपिंग के साथ आता है!"
        }
      ]
    },
    kannada: {
      title: "ಹೋಂಕಾರ್ಟ್ ಬಗ್ಗೆ",
      sections: [
        {
          heading: "ಹೋಂಕಾರ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ",
          text: "ಹೋಂಕಾರ್ಟ್ ನಿಮ್ಮ ಎಲ್ಲಾ ಶಾಪಿಂಗ್ ಅಗತ್ಯಗಳಿಗಾಗಿ ನಿಮ್ಮ ಒಂದೇ ಸ್ಥಳವಾಗಿದೆ. ನಾವು ಭಾರತದಾದ್ಯಂತ ವಿಶ್ವಾಸಾರ್ಹ ಮಾರಾಟಗಾರರಿಂದ ಉತ್ತಮ ಉತ್ಪನ್ನಗಳನ್ನು ನಿಮ್ಮ ಬಾಗಿಲಿಗೆ ತಲುಪಿಸುತ್ತೇವೆ."
        },
        {
          heading: "ನಮ್ಮ ಧ್ಯೇಯ",
          text: "ಆನ್‌ಲೈನ್ ಶಾಪಿಂಗ್ ಅನುಭವವನ್ನು ಕ್ರಾಂತಿಗೊಳಿಸುವುದು, ಗ್ರಾಹಕರು ವಿಶ್ವಾಸದಿಂದ ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಲು ಮತ್ತು ಖರೀದಿಸಲು ಸಾಧ್ಯವಾಗುವಂತಹ ಸುಗಮ, ಸುರಕ್ಷಿತ ಮತ್ತು ಆನಂದದಾಯಕ ವೇದಿಕೆಯನ್ನು ಒದಗಿಸುವುದು."
        },
        {
          heading: "ಪ್ರಮುಖ ವೈಶಿಷ್ಟ್ಯಗಳು",
          points: [
            "ಬಹು ವಿಭಾಗಗಳಲ್ಲಿ ಉತ್ಪನ್ನಗಳ ವ್ಯಾಪಕ ಶ್ರೇಣಿ",
            "ಬಹು ಆಯ್ಕೆಗಳೊಂದಿಗೆ ಸುರಕ್ಷಿತ ಪಾವತಿ ಗೇಟ್‌ವೇ",
            "ನೈಜ-ಸಮಯದ ಆರ್ಡರ್ ಟ್ರ್ಯಾಕಿಂಗ್",
            "ಸುಲಭ ರಿಟರ್ನ್‌ಗಳು ಮತ್ತು ಮರುಪಾವತಿಗಳು",
            "24/7 ಗ್ರಾಹಕ ಬೆಂಬಲ",
            "ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ಶಿಫಾರಸುಗಳು"
          ]
        },
        {
          heading: "ಹೋಂಕಾರ್ಟ್ ಏಕೆ ಆಯ್ಕೆ ಮಾಡಬೇಕು?",
          text: "ನಾವು ಎಲ್ಲಕ್ಕಿಂತ ಹೆಚ್ಚಾಗಿ ಗ್ರಾಹಕರ ತೃಪ್ತಿಗೆ ಆದ್ಯತೆ ನೀಡುತ್ತೇವೆ. ನಮ್ಮ ಬಳಕೆದಾರ ಸ್ನೇಹಿ ಇಂಟರ್ಫೇಸ್, ಸ್ಪರ್ಧಾತ್ಮಕ ಬೆಲೆಗಳು ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ವಿತರಣಾ ಜಾಲದೊಂದಿಗೆ, ನಿಮ್ಮ ಶಾಪಿಂಗ್ ಅನುಭವವು ಅತ್ಯುತ್ತಮವಾಗಿದೆ ಎಂದು ನಾವು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳುತ್ತೇವೆ."
        },
        {
          heading: "ಪ್ರಾರಂಭಿಸಿ",
          text: "ನಮ್ಮ ವ್ಯಾಪಕ ಸಂಗ್ರಹದ ಮೂಲಕ ಬ್ರೌಸ್ ಮಾಡಿ, ಐಟಂಗಳನ್ನು ನಿಮ್ಮ ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿ ಚೆಕ್‌ಔಟ್ ಮಾಡಿ. ನಿಮ್ಮ ಮೊದಲ ಆರ್ಡರ್ ಉಚಿತ ಶಿಪ್ಪಿಂಗ್‌ನೊಂದಿಗೆ ಬರುತ್ತದೆ!"
        }
      ]
    }
  };

  const currentContent = content[selectedLanguage];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {currentContent.title}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setLanguageOpen(!languageOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Globe className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium capitalize">{selectedLanguage}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${languageOpen ? 'rotate-180' : ''}`} />
                </button>
                {languageOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setLanguageOpen(false)} />
                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-30 overflow-hidden">
                      {(['english', 'hindi', 'kannada'] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setSelectedLanguage(lang);
                            setLanguageOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors capitalize ${
                            selectedLanguage === lang ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {currentContent.sections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                {section.heading}
              </h3>
              {section.text && (
                <p className="text-gray-600 leading-relaxed ml-3">
                  {section.text}
                </p>
              )}
              {section.points && (
                <ul className="space-y-2 ml-6">
                  {section.points.map((point, pointIdx) => (
                    <li key={pointIdx} className="flex items-start gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                      <span className="flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="pt-6 border-t border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-700">
                {selectedLanguage === 'english' && "Start your shopping journey with HomeCart today!"}
                {selectedLanguage === 'hindi' && "आज ही होमकार्ट के साथ अपनी शॉपिंग यात्रा शुरू करें!"}
                {selectedLanguage === 'kannada' && "ಇಂದೇ ಹೋಂಕಾರ್ಟ್‌ನೊಂದಿಗೆ ನಿಮ್ಮ ಶಾಪಿಂಗ್ ಪ್ರಯಾಣವನ್ನು ಪ್ರಾರಂಭಿಸಿ!"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function DashboardLayout({ 
  children, 
  title, 
  role, 
  sidebarItems
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showKnowMore, setShowKnowMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);




  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 relative">
      {/* Background Elements */}
      <FloatingParticles />
      <AnimatedOrb />
      
      {/* Static grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Topbar */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'glass-card shadow-lg' : 'bg-white/80 backdrop-blur-md'
      } border-b border-gray-200/50`}>
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden hover:bg-white/50"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
                HomeCart
              </span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <motion.div 
              className="relative w-full"
              animate={{ scale: searchFocused ? 1.02 : 1 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search products, categories, or brands..."
                className="pl-10 glass-card border-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </motion.div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3 relative">
            {/* Know More Button */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className="relative hover:bg-white/50"
                onClick={() => setShowKnowMore(true)}
              >
                <Info className="w-5 h-5 text-blue-600" />
                <span className="hidden sm:inline ml-2 text-sm">Know More</span>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-9 glass-card border-none"
            />
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 glass-card min-h-[calc(100vh-4rem)] p-4 border-r border-gray-200/50 backdrop-blur-md">
          <div className="mb-6">
            <motion.div 
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Role</p>
              <p className="font-semibold text-gray-900 mt-1">{role}</p>
            </motion.div>
          </div>
          
          <nav className="space-y-1">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <motion.div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    item.active
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.active && <ChevronRight className="w-4 h-4" />}
                </motion.div>
              );

              return item.href ? (
                <Link key={index} to={item.href}>
                  {content}
                </Link>
              ) : (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="w-full text-left"
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar - Mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25 }}
                className="fixed left-0 top-0 bottom-0 w-80 glass-card p-4 z-50 lg:hidden overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                  <Link to="/" className="flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      HomeCart
                    </span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="mb-6">
                  <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                    <p className="text-xs text-gray-600 font-medium">Role</p>
                    <p className="font-semibold text-gray-900 mt-1">{role}</p>
                  </div>
                </div>
                <nav className="space-y-1">
                  {sidebarItems.map((item, index) => {
                    const Icon = item.icon;
                    const content = (
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          item.active
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-white/50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                    );

                    return item.href ? (
                      <Link key={index} to={item.href} onClick={() => setSidebarOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        key={index}
                        onClick={() => {
                          item.onClick?.();
                          setSidebarOpen(false);
                        }}
                        className="w-full text-left"
                      >
                        {content}
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your dashboard.</p>
          </motion.div>
          
          {children}
        </main>
      </div>

      {/* Know More Modal */}
      <AnimatePresence>
        {showKnowMore && (
          <KnowMoreModal
            isOpen={showKnowMore}
            onClose={() => setShowKnowMore(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}