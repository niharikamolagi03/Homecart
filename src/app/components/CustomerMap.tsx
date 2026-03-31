import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  orderId: number;
  customerLat?: number;
  customerLng?: number;
}

export default function CustomerMap({ orderId, customerLat, customerLng }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const agentMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Fetching delivery location...');

  const fetchLocation = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/delivery/location/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setStatus('Delivery location not available yet'); return; }
      const data = await res.json();
      const { latitude, longitude } = data;

      if (!mapRef.current) return;

      if (!agentMarkerRef.current) {
        const icon = L.divIcon({
          html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
          className: '', iconSize: [16, 16], iconAnchor: [8, 8],
        });
        agentMarkerRef.current = L.marker([latitude, longitude], { icon })
          .addTo(mapRef.current)
          .bindPopup('🚚 Delivery Agent');
      } else {
        agentMarkerRef.current.setLatLng([latitude, longitude]);
      }
      mapRef.current.panTo([latitude, longitude]);
      setStatus('Live tracking active');
    } catch {
      setStatus('Unable to fetch location');
    }
  }, [orderId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = customerLat && customerLng
      ? [customerLat, customerLng] : [20.5937, 78.9629]; // India center fallback

    const map = L.map(containerRef.current).setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Customer marker
    if (customerLat && customerLng) {
      const icon = L.divIcon({
        html: `<div style="background:#7c3aed;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
      });
      L.marker([customerLat, customerLng], { icon }).addTo(map).bindPopup('🏠 Your Location');
    }

    mapRef.current = map;
    fetchLocation();

    // Poll every 4 seconds
    const interval = setInterval(fetchLocation, 4000);
    return () => { clearInterval(interval); map.remove(); mapRef.current = null; };
  }, [fetchLocation, customerLat, customerLng]);

  return (
    <div className="relative w-full" style={{ height: '350px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-700 shadow">
        {status}
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1 text-xs">
        <span className="bg-white/90 px-2 py-1 rounded-full shadow flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> Delivery Agent
        </span>
        <span className="bg-white/90 px-2 py-1 rounded-full shadow flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Your Location
        </span>
      </div>
    </div>
  );
}
