import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, ExternalLink, Navigation, Maximize2, X, Globe, Layers } from 'lucide-react';

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const createDisplayMarkerIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 14px; height: 14px; background: rgba(225, 29, 72, 0.3); border-radius: 50%; transform: scale(2); animation: pulse 2s infinite;"></div>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#e11d48" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 5px rgba(0,0,0,0.4));">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-display-leaflet-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
};

interface GrievanceMapDisplayProps {
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  title?: string;
}

export default function GrievanceMapDisplay({
  latitude,
  longitude,
  locationAddress,
  title = 'Grievance Site Location',
}: GrievanceMapDisplayProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const modalMapRef = useRef<HTMLDivElement | null>(null);

  const leafletMap = useRef<L.Map | null>(null);
  const modalLeafletMap = useRef<L.Map | null>(null);

  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // Inline Map setup
  useEffect(() => {
    if (!latitude || !longitude || !mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
      });

      L.tileLayer(mapLayer === 'satellite' ? SATELLITE_TILES : OSM_TILES, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      L.marker([latitude, longitude], {
        icon: createDisplayMarkerIcon(),
      })
        .addTo(map)
        .bindPopup(`<b>${title}</b><br/>${locationAddress || 'Pinpointed Site'}`);

      leafletMap.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } else {
      leafletMap.current.setView([latitude, longitude], 15);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [latitude, longitude, title, locationAddress, mapLayer]);

  // Modal Map setup
  useEffect(() => {
    if (isFullMapOpen && latitude && longitude && modalMapRef.current) {
      if (modalLeafletMap.current) {
        modalLeafletMap.current.remove();
        modalLeafletMap.current = null;
      }

      const map = L.map(modalMapRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
      });

      L.tileLayer(mapLayer === 'satellite' ? SATELLITE_TILES : OSM_TILES, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.marker([latitude, longitude], {
        icon: createDisplayMarkerIcon(),
      })
        .addTo(map)
        .bindPopup(`<b>${title}</b><br/>${locationAddress || 'Pinpointed Site'}`)
        .openPopup();

      modalLeafletMap.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    return () => {
      if (modalLeafletMap.current) {
        modalLeafletMap.current.remove();
        modalLeafletMap.current = null;
      }
    };
  }, [isFullMapOpen, latitude, longitude, title, locationAddress, mapLayer]);

  if (!latitude || !longitude) {
    if (locationAddress) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-2.5 text-xs text-slate-700">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{locationAddress}</span>
        </div>
      );
    }
    return null;
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <MapPin className="h-4 w-4 text-rose-600 shrink-0" />
          <span>Pinpointed Site Location</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFullMapOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 cursor-pointer"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Open Full Map</span>
          </button>
        </div>
      </div>

      {locationAddress && (
        <p className="text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
          <Navigation className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{locationAddress}</span>
        </p>
      )}

      {/* Embedded Leaflet Map */}
      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 z-0">
        <div ref={mapRef} className="h-full w-full z-0" />

        {/* Expand overlay */}
        <button
          type="button"
          onClick={() => setIsFullMapOpen(true)}
          className="absolute top-2 right-2 z-[400] flex items-center gap-1 rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-900 shadow-md cursor-pointer transition-all"
        >
          <Maximize2 className="h-3 w-3 text-blue-400" />
          <span>Full Map</span>
        </button>
      </div>

      {/* FULL SCREEN MAP DISPLAY MODAL */}
      {isFullMapOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-md p-2 sm:p-6 animate-fade-in">
          <div className="flex flex-col h-full w-full max-w-7xl mx-auto rounded-2xl bg-white overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-bold">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{title}</span>
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
                      Grievance Location
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    GPS Coordinates: {latitude}°, {longitude}°
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMapLayer((prev) => (prev === 'osm' ? 'satellite' : 'osm'))}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  <span>{mapLayer === 'osm' ? 'Satellite' : 'Map View'}</span>
                </button>

                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <span>OpenStreetMap</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsFullMapOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Map Canvas */}
            <div className="relative flex-1 w-full bg-slate-200 z-0">
              <div ref={modalMapRef} className="h-full w-full z-0" />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">
                  {locationAddress || `Lat: ${latitude}, Lng: ${longitude}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsFullMapOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Full Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
