import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, MapPin } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Vehicle {
  vehicle_id: number;
  vehicle_number: string;
  driver_name: string;
  latitude: number;
  longitude: number;
  route_name?: string;
}

interface GPSMapProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  showRoutes?: boolean;
  accessToken?: string;
}

const GPSMap: React.FC<GPSMapProps> = ({ vehicles, onVehicleClick, accessToken }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Force English language for map tiles
    const originalLang = navigator.language;
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true
    });

    try {
      // Initialize Leaflet map with safe defaults
      const center: [number, number] = [30.3753, 69.3451]; // Center of Pakistan
      map.current = L.map(mapContainer.current, {
        center: center,
        zoom: 10,
        zoomControl: true,
        preferCanvas: false
      });

      // Add Esri World Street Map tiles with English labels
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
        maxZoom: 20,
      }).addTo(map.current);

      // Add a marker for Pakistan center
      const pakistanMarker = L.marker([30.3753, 69.3451])
        .addTo(map.current)
        .bindPopup(`
          <div class="p-2">
            <h4 class="font-bold">Pakistan</h4>
            <p>Center of Pakistan</p>
            <p class="text-xs font-mono">30.3753, 69.3451</p>
          </div>
        `);

      // Add basic controls
      L.control.zoom({
        position: 'topright'
      }).addTo(map.current);

      setMapLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to load map');
      setMapLoaded(true); // Prevent infinite loading
    }

    return () => {
      // Clean up
      if (map.current) {
        Object.values(markersRef.current).forEach(marker => {
          map.current?.removeLayer(marker);
        });
        markersRef.current = {};
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when vehicles change
  useEffect(() => {
    if (!map.current || !mapLoaded || error) return;

    try {
      // Remove old markers
      Object.values(markersRef.current).forEach(marker => {
        map.current?.removeLayer(marker);
      });
      markersRef.current = {};

      // Add markers for vehicles with valid coordinates
      vehicles.forEach(vehicle => {
        if (!vehicle.latitude || !vehicle.longitude ||
            isNaN(vehicle.latitude) || isNaN(vehicle.longitude)) return;

        const marker = L.marker([vehicle.latitude, vehicle.longitude])
          .addTo(map.current!)
          .bindPopup(`
            <div class="p-2">
              <h4 class="font-bold">${vehicle.vehicle_number}</h4>
              <p>Driver: ${vehicle.driver_name}</p>
              ${vehicle.route_name ? `<p>Route: ${vehicle.route_name}</p>` : ''}
              <p class="text-xs font-mono">${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)}</p>
            </div>
          `);

        // Add click handler
        marker.on('click', () => {
          onVehicleClick?.(vehicle);
        });

        markersRef.current[vehicle.vehicle_id] = marker;
      });

      // Fit map to show all markers if there are any
      const validVehicles = vehicles.filter(v =>
        v.latitude && v.longitude && !isNaN(v.latitude) && !isNaN(v.longitude)
      );

      if (validVehicles.length > 0) {
        const bounds = L.latLngBounds(
          validVehicles.map(v => [v.latitude, v.longitude] as [number, number])
        );
        map.current.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
      }
    } catch (err) {
      console.error('Marker update error:', err);
      setError('Failed to update markers');
    }
  }, [vehicles, mapLoaded, onVehicleClick, error]);

  // Error fallback
  if (error) {
    return (
      <div className="relative w-full h-full min-h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">Map Error</p>
          <p className="text-xs text-muted-foreground/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GPSMap;
