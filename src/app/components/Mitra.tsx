/**
 * Mitra — HomeCart's multilingual floating chatbot assistant.
 * Languages: English, Hindi, Kannada
 * Features: text chat, text-to-speech speaker button, smart FAQ responses
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Volume2, VolumeX, Globe, ChevronDown, Mic, Bot } from 'lucide-react';

type Lang = 'english' | 'hindi' | 'kannada';

interface Message {
  id: number;
  from: 'user' | 'mitra';
  text: string;
  lang: Lang;
}

// ── UI strings per language ───────────────────────────────────────────────────
const UI = {
  english: {
    greeting: "Hi! I'm Mitra 👋 Your HomeCart assistant. How can I help you today?",
    placeholder: 'Type your message...',
    title: 'Mitra',
    subtitle: 'HomeCart Assistant',
    langLabel: 'English',
    thinking: 'Thinking...',
  },
  hindi: {
    greeting: 'नमस्ते! मैं मित्र हूँ 👋 आपका HomeCart सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?',
    placeholder: 'अपना संदेश लिखें...',
    title: 'मित्र',
    subtitle: 'HomeCart सहायक',
    langLabel: 'हिंदी',
    thinking: 'सोच रहा हूँ...',
  },
  kannada: {
    greeting: 'ನಮಸ್ಕಾರ! ನಾನು ಮಿತ್ರ 👋 ನಿಮ್ಮ HomeCart ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    placeholder: 'ನಿಮ್ಮ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...',
    title: 'ಮಿತ್ರ',
    subtitle: 'HomeCart ಸಹಾಯಕ',
    langLabel: 'ಕನ್ನಡ',
    thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...',
  },
};

// ── FAQ knowledge base per language ──────────────────────────────────────────
const KB: Record<Lang, Array<{ patterns: string[]; answer: string }>> = {
  english: [
    { patterns: ['order', 'track', 'delivery', 'status'], answer: 'You can track your order in the Orders section of your dashboard. Click "Track Order" on any active order to see live location.' },
    { patterns: ['vendor', 'product', 'wholesale', 'buy'], answer: 'Vendors list wholesale products. As a shopkeeper, browse them and send a purchase request. The vendor will approve or reject it.' },
    { patterns: ['request', 'approve', 'reject', 'pending'], answer: 'After you send a purchase request, the vendor reviews it. Once approved, set your selling price to activate the product in your shop.' },
    { patterns: ['price', 'selling', 'set price'], answer: 'After vendor approval, go to your Requests tab and enter your selling price. It must be higher than the wholesale price.' },
    { patterns: ['notification', 'alert', 'notify'], answer: 'Notifications appear in the bell icon at the top. Vendors get notified of new requests; shopkeepers get notified of approvals/rejections.' },
    { patterns: ['login', 'register', 'account', 'password'], answer: 'Use your email and password to log in. Forgot your password? Click "Forgot Password" on the login page.' },
    { patterns: ['cart', 'checkout', 'payment'], answer: 'Add products to your cart and proceed to checkout. We support multiple payment methods.' },
    { patterns: ['map', 'location', 'gps'], answer: 'The delivery dashboard shows a live map with your real-time location and delivery stops using OpenStreetMap.' },
    { patterns: ['hello', 'hi', 'hey', 'namaste'], answer: "Hello! 😊 I'm Mitra, your HomeCart assistant. Ask me anything about orders, products, vendors, or your account!" },
    { patterns: ['thank', 'thanks', 'bye', 'goodbye'], answer: "You're welcome! Have a great day 🙏 Feel free to ask anytime." },
  ],
  hindi: [
    { patterns: ['ऑर्डर', 'ट्रैक', 'डिलीवरी', 'स्थिति'], answer: 'आप अपने डैशबोर्ड के ऑर्डर सेक्शन में अपना ऑर्डर ट्रैक कर सकते हैं। किसी भी सक्रिय ऑर्डर पर "ट्रैक ऑर्डर" पर क्लिक करें।' },
    { patterns: ['विक्रेता', 'उत्पाद', 'थोक', 'खरीद'], answer: 'विक्रेता थोक उत्पाद सूचीबद्ध करते हैं। दुकानदार के रूप में, उन्हें ब्राउज़ करें और खरीद अनुरोध भेजें।' },
    { patterns: ['अनुरोध', 'स्वीकृत', 'अस्वीकृत', 'लंबित'], answer: 'अनुरोध भेजने के बाद, विक्रेता इसकी समीक्षा करता है। स्वीकृत होने पर, अपनी बिक्री मूल्य निर्धारित करें।' },
    { patterns: ['मूल्य', 'कीमत', 'बिक्री'], answer: 'विक्रेता की स्वीकृति के बाद, अनुरोध टैब में जाएं और अपनी बिक्री कीमत दर्ज करें।' },
    { patterns: ['सूचना', 'अलर्ट', 'नोटिफिकेशन'], answer: 'सूचनाएं शीर्ष पर बेल आइकन में दिखाई देती हैं।' },
    { patterns: ['नमस्ते', 'हेलो', 'हाय'], answer: 'नमस्ते! 😊 मैं मित्र हूँ। ऑर्डर, उत्पाद, या खाते के बारे में कुछ भी पूछें!' },
    { patterns: ['धन्यवाद', 'शुक्रिया', 'अलविदा'], answer: 'आपका स्वागत है! आपका दिन शुभ हो 🙏' },  ],
  kannada: [
    { patterns: ['ಆರ್ಡರ್', 'ಟ್ರ್ಯಾಕ್', 'ಡೆಲಿವರಿ', 'ಸ್ಥಿತಿ'], answer: 'ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನ ಆರ್ಡರ್ ವಿಭಾಗದಲ್ಲಿ ನಿಮ್ಮ ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಬಹುದು।' },
    { patterns: ['ವಿಕ್ರೇತ', 'ಉತ್ಪನ್ನ', 'ಸಗಟು', 'ಖರೀದಿ'], answer: 'ವಿಕ್ರೇತರು ಸಗಟು ಉತ್ಪನ್ನಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡುತ್ತಾರೆ. ಅಂಗಡಿಕಾರರಾಗಿ, ಅವುಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ ಮತ್ತು ಖರೀದಿ ವಿನಂತಿ ಕಳುಹಿಸಿ।' },
    { patterns: ['ವಿನಂತಿ', 'ಅನುಮೋದನೆ', 'ತಿರಸ್ಕಾರ', 'ಬಾಕಿ'], answer: 'ವಿನಂತಿ ಕಳುಹಿಸಿದ ನಂತರ, ವಿಕ್ರೇತ ಅದನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ. ಅನುಮೋದಿಸಿದ ನಂತರ, ನಿಮ್ಮ ಮಾರಾಟ ಬೆಲೆ ನಿಗದಿಪಡಿಸಿ।' },
    { patterns: ['ಬೆಲೆ', 'ಮಾರಾಟ', 'ಬೆಲೆ ನಿಗದಿ'], answer: 'ವಿಕ್ರೇತ ಅನುಮೋದನೆಯ ನಂತರ, ವಿನಂತಿ ಟ್ಯಾಬ್‌ಗೆ ಹೋಗಿ ಮತ್ತು ನಿಮ್ಮ ಮಾರಾಟ ಬೆಲೆ ನಮೂದಿಸಿ।' },
    { patterns: ['ನಮಸ್ಕಾರ', 'ಹಲೋ', 'ಹಾಯ್'], answer: 'ನಮಸ್ಕಾರ! 😊 ನಾನು ಮಿತ್ರ. ಆರ್ಡರ್, ಉತ್ಪನ್ನ, ಅಥವಾ ಖಾತೆಯ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ!' },
    { patterns: ['ಧನ್ಯವಾದ', 'ಬಾಯ್', 'ಅಲ್ವಿದಾ'], answer: 'ಸ್ವಾಗತ! ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಲಿ 🙏' },
  ],
};

const fallback: Record<Lang, string> = {
  english: "I'm not sure about that, but I'm here to help! Try asking about orders, products, vendors, notifications, or your account.",
  hindi: 'मुझे इसके बारे में पूरी जानकारी नहीं है, लेकिन मैं मदद के लिए यहाँ हूँ! ऑर्डर, उत्पाद, या खाते के बारे में पूछें।',
  kannada: 'ನನಗೆ ಅದರ ಬಗ್ಗೆ ಖಚಿತವಿಲ್ಲ, ಆದರೆ ನಾನು ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ! ಆರ್ಡರ್, ಉತ್ಪನ್ನ, ಅಥವಾ ಖಾತೆಯ ಬಗ್ಗೆ ಕೇಳಿ।',
};

function getAnswer(input: string, lang: Lang): string {
  const lower = input.toLowerCase();
  for (const entry of KB[lang]) {
    if (entry.patterns.some(p => lower.includes(p))) return entry.answer;
  }
  // Also try English KB as fallback for non-English input
  if (lang !== 'english') {
    for (const entry of KB.english) {
      if (entry.patterns.some(p => lower.includes(p))) return entry.answer;
    }
  }
  return fallback[lang];
}

// ── Text-to-speech helper ─────────────────────────────────────────────────────
// Kannada has no voice on most browsers/macOS.
// Solution: store a phonetic English transliteration for every Kannada string
// and speak that with the English voice so it sounds like Kannada words.

const kannadaPhonetic: Record<string, string> = {
  // UI greetings
  'ನಮಸ್ಕಾರ! ನಾನು ಮಿತ್ರ 👋 ನಿಮ್ಮ HomeCart ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?':
    'Namaskara! Naanu Mitra. Nimma HomeCart sahayaka. Indu naanu nimage hege sahaya madali?',
  // KB answers
  'ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನ ಆರ್ಡರ್ ವಿಭಾಗದಲ್ಲಿ ನಿಮ್ಮ ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಬಹುದು।':
    'Nimma dashboard na order vibhagadalli nimma order track madabahudu.',
  'ವಿಕ್ರೇತರು ಸಗಟು ಉತ್ಪನ್ನಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡುತ್ತಾರೆ. ಅಂಗಡಿಕಾರರಾಗಿ, ಅವುಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ ಮತ್ತು ಖರೀದಿ ವಿನಂತಿ ಕಳುಹಿಸಿ।':
    'Vikretaru sagatu utpannagalannu patti maduttare. Angadikaararaagi, avugalannu browse madi mattu kharidi vinanti kaluhisi.',
  'ವಿನಂತಿ ಕಳುಹಿಸಿದ ನಂತರ, ವಿಕ್ರೇತ ಅದನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ. ಅನುಮೋದಿಸಿದ ನಂತರ, ನಿಮ್ಮ ಮಾರಾಟ ಬೆಲೆ ನಿಗದಿಪಡಿಸಿ।':
    'Vinanti kaluhisida nantara, vikretha adannu parisheelisuttare. Anumodisida nantara, nimma marata bele nigadipaDisi.',
  'ವಿಕ್ರೇತ ಅನುಮೋದನೆಯ ನಂತರ, ವಿನಂತಿ ಟ್ಯಾಬ್‌ಗೆ ಹೋಗಿ ಮತ್ತು ನಿಮ್ಮ ಮಾರಾಟ ಬೆಲೆ ನಮೂದಿಸಿ।':
    'Vikretha anumodaneya nantara, vinanti tab ge hogi mattu nimma marata bele namuudisi.',
  'ನಮಸ್ಕಾರ! 😊 ನಾನು ಮಿತ್ರ. ಆರ್ಡರ್, ಉತ್ಪನ್ನ, ಅಥವಾ ಖಾತೆಯ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ!':
    'Namaskara! Naanu Mitra. Order, utpanna, athava khaateya bagge enadaroo keeli!',
  'ಸ್ವಾಗತ! ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಲಿ 🙏':
    'Swagata! Nimma dina shubhavaagali.',
  'ನನಗೆ ಅದರ ಬಗ್ಗೆ ಖಚಿತವಿಲ್ಲ, ಆದರೆ ನಾನು ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ! ಆರ್ಡರ್, ಉತ್ಪನ್ನ, ಅಥವಾ ಖಾತೆಯ ಬಗ್ಗೆ ಕೇಳಿ।':
    'Nanage adara bagge khachitavilla, aadare naanu sahaya madalu illiddene! Order, utpanna, athava khaateya bagge keeli.',
};

const voiceCandidates: Record<Lang, string[]> = {
  english: ['en-IN', 'en-GB', 'en-US', 'en'],
  hindi:   ['hi-IN', 'hi'],
  // Kannada voice doesn't exist on most systems — we use phonetic + English voice
  kannada: ['en-IN', 'en-GB', 'en-US', 'en'],
};

function speak(text: string, lang: Lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  // For Kannada: use the phonetic transliteration so English voice reads it correctly
  const speakText = lang === 'kannada'
    ? (kannadaPhonetic[text] ?? text)
    : text;

  const utt = new SpeechSynthesisUtterance(speakText);
  utt.rate = lang === 'kannada' ? 0.88 : 0.92;
  utt.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const candidates = voiceCandidates[lang];

  let chosen: SpeechSynthesisVoice | null = null;
  for (const code of candidates) {
    const v = voices.find(v => v.lang === code) ?? voices.find(v => v.lang.startsWith(code.split('-')[0]));
    if (v) { chosen = v; break; }
  }

  if (chosen) utt.voice = chosen;
  utt.lang = chosen?.lang ?? candidates[0];

  window.speechSynthesis.speak(utt);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Mitra() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('english');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speech recognition lang codes
  const srLangMap: Record<Lang, string> = {
    english: 'en-IN',
    hindi: 'hi-IN',
    kannada: 'kn-IN',
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Try Chrome.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = srLangMap[lang];
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
      // Auto-send when speech is final
      if (e.results[e.results.length - 1].isFinal) {
        setInput('');
        setListening(false);
        recognition.stop();
        // Send the final transcript directly
        const text = transcript.trim();
        if (!text) return;
        const userMsg: Message = { id: Date.now(), from: 'user', text, lang };
        setMessages(prev => [...prev, userMsg]);
        setThinking(true);
        setTimeout(async () => {
          const answer = getAnswer(text, lang);
          const mitraMsg: Message = { id: Date.now() + 1, from: 'mitra', text: answer, lang };
          setMessages(prev => [...prev, mitraMsg]);
          setThinking(false);
          if (speakerOn) speak(answer, lang);
        }, 600);
      }
    };

    recognition.start();
  };

  // Init greeting when opened or language changes
  useEffect(() => {
    if (open) {
      setMessages([{ id: Date.now(), from: 'mitra', text: UI[lang].greeting, lang }]);
    }
  }, [open, lang]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const userMsg: Message = { id: Date.now(), from: 'user', text, lang };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);

    // Simulate a short thinking delay
    await new Promise(r => setTimeout(r, 600));

    const answer = getAnswer(text, lang);
    const mitraMsg: Message = { id: Date.now() + 1, from: 'mitra', text: answer, lang };
    setMessages(prev => [...prev, mitraMsg]);
    setThinking(false);

    if (speakerOn) speak(answer, lang);
  };

  const handleSpeak = (text: string, msgLang: Lang) => {
    speak(text, msgLang);
  };

  const stopSpeech = () => window.speechSynthesis?.cancel();

  const langs: { key: Lang; label: string; flag: string }[] = [
    { key: 'english', label: 'English', flag: '🇬🇧' },
    { key: 'hindi', label: 'हिंदी', flag: '🇮🇳' },
    { key: 'kannada', label: 'ಕನ್ನಡ', flag: '🌟' },
  ];

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => { setOpen(o => !o); stopSpeech(); }}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Chat with Mitra"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Bot className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30 pointer-events-none" />
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed bottom-24 right-6 z-[199] w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ height: '520px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{UI[lang].title}</p>
                  <p className="text-white/70 text-xs">{UI[lang].subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Speaker toggle */}
                <button
                  onClick={() => { setSpeakerOn(s => !s); if (speakerOn) stopSpeech(); }}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title={speakerOn ? 'Mute speaker' : 'Unmute speaker'}
                >
                  {speakerOn ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white" />}
                </button>

                {/* Language selector */}
                <div className="relative">
                  <button
                    onClick={() => setLangMenuOpen(l => !l)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-white" />
                    <span className="text-white text-xs font-medium hidden sm:inline">
                      {langs.find(l => l.key === lang)?.flag}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-white transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {langMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10"
                      >
                        {langs.map(l => (
                          <button
                            key={l.key}
                            onClick={() => { setLang(l.key); setLangMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${lang === l.key ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}
                          >
                            <span>{l.flag}</span>
                            <span>{l.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {msg.from === 'mitra' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`group relative max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.text}
                    {/* Per-message speak button */}
                    {msg.from === 'mitra' && (
                      <button
                        onClick={() => handleSpeak(msg.text, msg.lang)}
                        className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3 h-3 text-blue-600" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Thinking indicator */}
              {thinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} className="w-2 h-2 bg-blue-400 rounded-full"
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-3 py-3 border-t border-gray-100 bg-white shrink-0 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={listening ? '🎙️ Listening...' : UI[lang].placeholder}
                className={`flex-1 px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 transition-colors ${
                  listening ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200'
                }`}
              />
              {/* Mic button */}
              <motion.button
                onClick={startListening}
                whileTap={{ scale: 0.9 }}
                title={listening ? 'Stop listening' : 'Speak your query'}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  listening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {listening ? (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <Mic className="w-4 h-4" />
                  </motion.span>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </motion.button>
              {/* Send button */}
              <motion.button
                onClick={sendMessage}
                disabled={!input.trim()}
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
