import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  agentLat: number;
  agentLng: number;
  destLat?: number;
  destLng?: number;
  destLabel?: string;
}

export default function DeliveryMap({ agentLat, agentLng, destLat, destLng, destLabel = 'Destination' }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const agentMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([agentLat, agentLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Agent marker (blue)
    const agentIcon = L.divIcon({
      html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    agentMarkerRef.current = L.marker([agentLat, agentLng], { icon: agentIcon })
      .addTo(map)
      .bindPopup('📍 Your Location');

    // Destination marker (red)
    if (destLat && destLng) {
      const destIcon = L.divIcon({
        html: `<div style="background:#dc2626;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([destLat, destLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`📦 ${destLabel}`);

      // Fit both markers in view
      map.fitBounds([[agentLat, agentLng], [destLat, destLng]], { padding: [40, 40] });
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update agent marker position when location changes
  useEffect(() => {
    if (!mapRef.current || !agentMarkerRef.current) return;
    agentMarkerRef.current.setLatLng([agentLat, agentLng]);
    mapRef.current.panTo([agentLat, agentLng]);
  }, [agentLat, agentLng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '350px', borderRadius: '12px' }} />;
}
