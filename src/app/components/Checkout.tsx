import { useState } from 'react';
import { MapPin, X, Smartphone, Banknote, CheckCircle, Navigation } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { placeOrder } from '@/services/api';

interface Props {
  cartTotal: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentMethod = 'CASH' | 'UPI';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

export default function Checkout({ cartTotal, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>('CASH');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reverse geocode coords → readable address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  // Forward geocode typed address → coords
  const geocodeAddress = async (addr: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* silent */ }
    return null;
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        const readable = await reverseGeocode(lat, lng);
        setAddress(readable);
        setLocating(false);
      },
      () => {
        setError('Location access denied. Please enter your address manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDetailsNext = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (!address.trim()) { setError('Please enter delivery address'); return; }
    setError('');

    // If no GPS coords yet (manual address), geocode the typed address
    if (!coords) {
      const geocoded = await geocodeAddress(address);
      if (geocoded) setCoords(geocoded);
    }
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (payment === 'UPI' && !upiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. name@upi)'); return;
    }
    setLoading(true); setError('');
    // Last-chance geocode if still no coords
    let finalCoords = coords;
    if (!finalCoords) finalCoords = await geocodeAddress(address);

    try {
      await placeOrder({
        delivery_address: `${name}, ${phone}, ${address}`,
        payment_method: payment,
        latitude: finalCoords?.lat || null,
        longitude: finalCoords?.lng || null,
      });
      setStep('success');
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setError(`Failed: ${err.message}`);
    } finally { setLoading(false); }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500">Your order has been placed and a delivery partner has been notified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">Checkout</h2>
            <p className="text-xs text-gray-400">{step === 'details' ? 'Step 1: Delivery Details' : 'Step 2: Payment'}</p>
          </div>
          <button onClick={onCancel}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          {/* Step 1: Delivery Details */}
          {step === 'details' && (
            <>
              <div>
                <Label>Full Name *</Label>
                <Input className="mt-1" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input className="mt-1" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Delivery Address *</Label>
                <textarea
                  className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="House No, Street, City, State, PIN"
                  value={address}
                  onChange={e => { setAddress(e.target.value); setCoords(null); }}
                />
                {/* Use current location button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {locating ? 'Detecting location...' : 'Use my current location'}
                </Button>
                {coords && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Location detected — delivery partner will see your pin on the map
                  </p>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Subtotal</span><span>{fmt(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Delivery</span><span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                  <span>Total</span><span className="text-blue-600">{fmt(cartTotal)}</span>
                </div>
              </div>

              <Button onClick={handleDetailsNext} className="w-full bg-blue-600 text-white">
                Continue to Payment →
              </Button>
            </>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <>
              <Label>Select Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'CASH', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when delivered' },
                  { id: 'UPI', label: 'UPI', icon: '📱', desc: 'GPay, PhonePe' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setPayment(m.id); setError(''); }}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${payment === m.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="text-3xl mb-1">{m.icon}</div>
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-xs text-gray-400">{m.desc}</div>
                  </button>
                ))}
              </div>

              {payment === 'UPI' && (
                <div>
                  <Label className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> UPI ID</Label>
                  <Input className="mt-1" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">e.g. 9876543210@paytm, name@gpay</p>
                </div>
              )}

              {payment === 'CASH' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-yellow-600 shrink-0" />
                  <p className="text-sm text-yellow-700">Pay {fmt(cartTotal)} in cash when your order arrives.</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between font-bold text-sm">
                  <span>Total to pay</span>
                  <span className="text-blue-600">{fmt(cartTotal)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1">← Back</Button>
                <Button onClick={handlePlaceOrder} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {loading ? 'Placing...' : `Place Order`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
