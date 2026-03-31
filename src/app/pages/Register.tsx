import { Link, useNavigate } from 'react-router';
import { ShoppingBag, Mail, Lock, User, Phone, MapPin, AlertCircle, Camera, Upload, CheckCircle, Shield, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback } from 'react';

// Roles that require AI identity verification
const VERIFIED_ROLES = ['VENDOR', 'SHOPKEEPER', 'DELIVERY'];

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '',
    password: '', confirmPassword: '', role: 'CUSTOMER',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // AI verification state
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const needsVerification = VERIFIED_ROLES.includes(formData.role);
  const verificationComplete = !needsVerification || (!!selfieFile && !!idFile);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear verification files when role changes
    if (field === 'role') {
      setSelfieFile(null); setSelfiePreview(null);
      setIdFile(null); setIdPreview(null);
    }
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch { setError('Camera access denied. Please allow camera permissions.'); }
  }, []);

  const closeCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraOpen(false);
  }, [cameraStream]);

  const captureSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      closeCamera();
    }, 'image/jpeg', 0.9);
  }, [closeCamera]);

  // ── ID document upload ────────────────────────────────────────────────────
  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (needsVerification && (!selfieFile || !idFile)) { setError('Please complete identity verification before registering.'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('phone', formData.phone);
      fd.append('address', formData.address);
      fd.append('password', formData.password);
      fd.append('role', formData.role);
      if (selfieFile) fd.append('selfie', selfieFile);
      if (idFile) fd.append('id_document', idFile);

      const res = await fetch('http://127.0.0.1:8000/api/auth/register/', {
        method: 'POST',
        body: fd, // no Content-Type header — browser sets multipart boundary
      });

      const data = await res.json();
      if (!res.ok) {
        const msgs = Object.values(data).flat().join(' | ');
        setError(msgs || 'Registration failed');
        return;
      }

      setSuccess(data.message);
      setTimeout(() => {
        const map: Record<string, string> = {
          CUSTOMER: '/login/customer', VENDOR: '/login/vendor',
          SHOPKEEPER: '/login/shopkeeper', DELIVERY: '/login/delivery',
        };
        navigate(map[formData.role] || '/login');
      }, 2500);
    } catch (err: any) {
      setError('Unable to connect to server. Make sure the backend is running.');
    } finally { setLoading(false); }
  };

  const roleLabel: Record<string, string> = {
    VENDOR: 'Vendor', SHOPKEEPER: 'Shopkeeper', DELIVERY: 'Delivery Partner',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HomeCart</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join HomeCart and start your journey</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="John Doe" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="pl-10" required />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="email" placeholder="you@example.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="pl-10" required />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} className="pl-10" required />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label>Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="123 Main St, City" value={formData.address} onChange={e => handleChange('address', e.target.value)} className="pl-10" required />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>I want to join as</Label>
              <Select value={formData.role} onValueChange={v => handleChange('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">🛍️ Customer</SelectItem>
                  <SelectItem value="VENDOR">🏪 Vendor</SelectItem>
                  <SelectItem value="SHOPKEEPER">🏬 Shopkeeper</SelectItem>
                  <SelectItem value="DELIVERY">🚚 Delivery Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── AI Verification Section ── */}
            <AnimatePresence>
              {needsVerification && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Identity Verification Required</p>
                        <p className="text-xs text-gray-500">{roleLabel[formData.role]} accounts require AI identity verification</p>
                      </div>
                    </div>

                    {/* Selfie */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">1. Take a Selfie</p>
                      {selfiePreview ? (
                        <div className="relative inline-block">
                          <img src={selfiePreview} alt="Selfie" className="w-24 h-24 rounded-xl object-cover border-2 border-green-400" />
                          <button type="button" onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={openCamera}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50">
                          <Camera className="w-4 h-4 mr-2" /> Open Camera
                        </Button>
                      )}
                    </div>

                    {/* ID Document */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">2. Upload ID Document <span className="text-gray-400 font-normal">(Aadhaar, PAN, Passport)</span></p>
                      {idPreview ? (
                        <div className="relative inline-block">
                          <img src={idPreview} alt="ID" className="w-32 h-20 rounded-xl object-cover border-2 border-green-400" />
                          <button type="button" onClick={() => { setIdFile(null); setIdPreview(null); if (idInputRef.current) idInputRef.current.value = ''; }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => idInputRef.current?.click()}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50">
                            <Upload className="w-4 h-4 mr-2" /> Upload ID
                          </Button>
                          <input ref={idInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleIdUpload} />
                        </>
                      )}
                    </div>

                    {/* Status */}
                    {selfieFile && idFile && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-green-700 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" /> Both documents captured — ready to submit
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => handleChange('password', e.target.value)} className="pl-10" required />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} className="pl-10" required />
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" disabled={loading || !verificationComplete || !!success} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white" size="lg">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {needsVerification ? 'Verifying identity...' : 'Creating account...'}
                </span>
              ) : needsVerification && !verificationComplete ? 'Complete verification to register' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
        </p>
      </motion.div>

      {/* ── Camera Modal ── */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
              <div className="flex justify-between items-center p-4 border-b">
                <p className="font-semibold text-gray-900">Take a Selfie</p>
                <button onClick={closeCamera}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="relative bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-48 border-4 border-white/60 rounded-full" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="p-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={closeCamera}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 text-white" onClick={captureSelfie}>
                  <Camera className="w-4 h-4 mr-2" /> Capture
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
