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
  const routeRef = useRef<L.Polyline | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawRoute = async (fromLat: number, fromLng: number) => {
    if (!mapRef.current || !destLat || !destLng) return;
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${destLng},${destLat}?overview=full&geometries=geojson`);
      const data = await response.json();
      const points: [number, number][] = data.routes?.[0]?.geometry?.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]) || [];
      if (!points.length) return;
      routeRef.current?.remove();
      routeRef.current = L.polyline(points, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(mapRef.current);
      mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [40, 40] });
    } catch {
      // Markers still provide a useful fallback if routing is temporarily unavailable.
    }
  };

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
      drawRoute(agentLat, agentLng);
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update agent marker position when location changes
  useEffect(() => {
    if (!mapRef.current || !agentMarkerRef.current) return;
    agentMarkerRef.current.setLatLng([agentLat, agentLng]);
    mapRef.current.panTo([agentLat, agentLng]);
    drawRoute(agentLat, agentLng);
  }, [agentLat, agentLng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '350px', borderRadius: '12px' }} />;
}
