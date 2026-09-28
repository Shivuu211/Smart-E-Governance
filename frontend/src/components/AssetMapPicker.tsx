import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Check,
  AlertCircle,
  Loader2,
  Compass,
  Maximize2,
  X,
  Search,
  Layers,
  ExternalLink,
  Globe,
} from 'lucide-react';
import LocationSuggestionDropdown from './LocationSuggestionDropdown';

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bengaluru Central

const BENGALURU_PRESETS = [
  { name: 'Bengaluru Central', lat: 12.9716, lng: 77.5946 },
  { name: 'JP Nagar Ward 3', lat: 12.9063, lng: 77.5857 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { name: 'Yelahanka Ward 4', lat: 13.1007, lng: 77.5963 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7499 },
  { name: 'Hebbal', lat: 13.0358, lng: 77.5970 },
  { name: 'Malleshwaram', lat: 12.9925, lng: 77.5712 },
];

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const createCustomAssetMarkerIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 18px; height: 18px; background: rgba(37, 99, 235, 0.35); border-radius: 50%; transform: scale(2.2); animation: pulse 1.8s infinite;"></div>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.45));">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-asset-leaflet-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

interface AssetMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  locationAddress: string;
  onChangeLocation: (lat: number, lng: number, address: string) => void;
  readOnly?: boolean;
}

export default function AssetMapPicker({
  latitude,
  longitude,
  locationAddress,
  onChangeLocation,
  readOnly = false,
}: AssetMapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const modalMapRef = useRef<HTMLDivElement | null>(null);

  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const modalLeafletMap = useRef<L.Map | null>(null);
  const modalMarkerRef = useRef<L.Marker | null>(null);
  const modalTileLayerRef = useRef<L.TileLayer | null>(null);

  const [position, setPosition] = useState<[number, number]>(
    latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER
  );
  const [addressInput, setAddressInput] = useState(locationAddress || '');
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // UI state
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locSuccess, setLocSuccess] = useState('');
  const [locError, setLocError] = useState('');
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [searching, setSearching] = useState(false);

  // Reverse geocoding via OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const addrObj = data.address || {};
          const street = addrObj.road || addrObj.pedestrian || addrObj.path || '';
          const locality =
            addrObj.suburb ||
            addrObj.neighbourhood ||
            addrObj.residential ||
            addrObj.village ||
            addrObj.town ||
            '';
          const city =
            addrObj.city ||
            addrObj.city_district ||
            addrObj.county ||
            addrObj.state_district ||
            'Bengaluru';
          const postcode = addrObj.postcode || '';

          const parts = [street, locality, city, addrObj.state].filter(Boolean);
          const cleanParts = parts.filter((item, index) => parts.indexOf(item) === index);

          let formatted = cleanParts.join(', ');
          if (postcode) formatted += ` - ${postcode}`;

          return formatted || data.display_name;
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    } finally {
      setGeocoding(false);
    }
    return `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  };

  const updateLocationState = useCallback(
    async (lat: number, lng: number, customAddr?: string) => {
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));
      setPosition([roundedLat, roundedLng]);

      let addrToUse = customAddr;
      if (addrToUse === undefined) {
        addrToUse = await reverseGeocode(roundedLat, roundedLng);
      }
      setAddressInput(addrToUse);
      onChangeLocation(roundedLat, roundedLng, addrToUse);
    },
    [onChangeLocation]
  );

  // Sync state if parent props change externally
  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
    if (locationAddress) {
      setAddressInput(locationAddress);
    }
  }, [latitude, longitude, locationAddress]);

  // Initialize main inline Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const initialLat = latitude || DEFAULT_CENTER[0];
      const initialLng = longitude || DEFAULT_CENTER[1];

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
      });

      const tileLayer = L.tileLayer(mapLayer === 'satellite' ? SATELLITE_TILES : OSM_TILES, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      const marker = L.marker([initialLat, initialLng], {
        icon: createCustomAssetMarkerIcon(),
        draggable: !readOnly,
      }).addTo(map);

      if (!readOnly) {
        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng();
          await updateLocationState(lat, lng);
        });

        map.on('click', async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          await updateLocationState(lat, lng);
        });
      }

      leafletMap.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Update map tile layer on layer change
  useEffect(() => {
    if (leafletMap.current && tileLayerRef.current) {
      tileLayerRef.current.setUrl(mapLayer === 'satellite' ? SATELLITE_TILES : OSM_TILES);
    }
    if (modalLeafletMap.current && modalTileLayerRef.current) {
      modalTileLayerRef.current.setUrl(mapLayer === 'satellite' ? SATELLITE_TILES : OSM_TILES);
    }
  }, [mapLayer]);

  // Sync inline & modal markers when position changes
  useEffect(() => {
    if (leafletMap.current && markerRef.current) {
      markerRef.current.setLatLng(position);
    }
    if (modalLeafletMap.current && modalMarkerRef.current) {
      modalMarkerRef.current.setLatLng(position);
    }
  }, [position]);

  // Initialize Modal Map when full map modal is opened
  useEffect(() => {
    if (isFullMapOpen && modalMapRef.current) {
      if (modalLeafletMap.current) {
        modalLeafletMap.current.remove();
        modalLeafletMap.current = null;
      }

      const map = L.map(modalMapRef.current, {
        center: position,
        zoom: 16,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
      });

      const tileLayer = L.tileLayer(mapLayer === 'satellite' ? SATELLITE_TILES : OSM_TILES, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      modalTileLayerRef.current = tileLayer;

      const marker = L.marker(position, {
        icon: createCustomAssetMarkerIcon(),
        draggable: !readOnly,
      }).addTo(map);

      if (!readOnly) {
        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng();
          await updateLocationState(lat, lng);
        });

        map.on('click', async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          await updateLocationState(lat, lng);
        });
      }

      modalLeafletMap.current = map;
      modalMarkerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    return () => {
      if (modalLeafletMap.current) {
        modalLeafletMap.current.remove();
        modalLeafletMap.current = null;
        modalMarkerRef.current = null;
        modalTileLayerRef.current = null;
      }
    };
  }, [isFullMapOpen]);

  // Live GPS handler
  const handleDetectLiveLocation = useCallback(() => {
    setLocating(true);
    setLocError('');
    setLocSuccess('');

    const applyLocation = async (lat: number, lng: number, sourceName: string) => {
      if (leafletMap.current && markerRef.current) {
        leafletMap.current.setView([lat, lng], 16);
        markerRef.current.setLatLng([lat, lng]);
      }
      if (modalLeafletMap.current && modalMarkerRef.current) {
        modalLeafletMap.current.setView([lat, lng], 16);
        modalMarkerRef.current.setLatLng([lat, lng]);
      }

      await updateLocationState(lat, lng);
      setLocating(false);
      setLocSuccess(`GPS location verified (${sourceName}): ${lat}°, ${lng}°`);
      setTimeout(() => setLocSuccess(''), 5000);
    };

    if (!navigator.geolocation) {
      applyLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'Bengaluru Central');
      setLocError('Browser Geolocation API unequipped.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyLocation(pos.coords.latitude, pos.coords.longitude, 'Live Officer GPS');
      },
      (err) => {
        console.warn('GPS error:', err);
        navigator.geolocation.getCurrentPosition(
          async (pos2) => {
            await applyLocation(pos2.coords.latitude, pos2.coords.longitude, 'Network GPS');
          },
          async () => {
            await applyLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'Bengaluru Central');
            setLocError('Could not access live device GPS. Centered on Bengaluru Central.');
            setLocating(false);
          },
          { enableHighAccuracy: false, timeout: 8000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocationState]);

  // Search Address
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);
    setSelectedSuggestionIndex(-1);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        if (data && data.length > 0) {
          setSelectedSuggestionIndex(0);
          if (data.length === 1) {
            selectSearchResult(data[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = async (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (leafletMap.current && markerRef.current) {
        leafletMap.current.setView([lat, lng], 16);
        markerRef.current.setLatLng([lat, lng]);
      }
      if (modalLeafletMap.current && modalMarkerRef.current) {
        modalLeafletMap.current.setView([lat, lng], 16);
        modalMarkerRef.current.setLatLng([lat, lng]);
      }
      await updateLocationState(lat, lng, item.display_name);
      setSearchResults([]);
      setSelectedSuggestionIndex(-1);
      setSearchQuery('');
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${position[0]},${position[1]}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${position[0]}&mlon=${position[1]}#map=16/${position[0]}/${position[1]}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-slate-50/90 p-3.5 sm:p-4 shadow-2xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Pin Infrastructure Site on Map</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-800 uppercase tracking-wider">
                GPS Map
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Place pinpoint marker so officers can locate asset easily
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={handleDetectLiveLocation}
              disabled={locating}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-all disabled:opacity-60 shadow-2xs cursor-pointer"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>{locating ? 'Locating...' : 'Live GPS'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullMapOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-2xs cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Open Map</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {locSuccess && (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 border border-emerald-200">
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{locSuccess}</span>
        </div>
      )}

      {locError && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 border border-amber-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{locError}</span>
        </div>
      )}

      {/* Search Input */}
      {!readOnly && (
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                      setSelectedSuggestionIndex((prev) => (prev + 1) % searchResults.length);
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                      setSelectedSuggestionIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchResults.length > 0 && selectedSuggestionIndex >= 0 && searchResults[selectedSuggestionIndex]) {
                      selectSearchResult(searchResults[selectedSuggestionIndex]);
                    } else {
                      handleSearchAddress();
                    }
                  } else if (e.key === 'Escape') {
                    setSearchResults([]);
                    setSelectedSuggestionIndex(-1);
                  }
                }}
                placeholder="Search Ward, street, or landmark (e.g. Ward 3, Shiva Temple Road)..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#172033] pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearchAddress()}
              disabled={searching || !searchQuery.trim()}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Preset chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
            <span className="font-bold text-slate-500 text-[10px] shrink-0 uppercase tracking-wider">
              Quick Presets:
            </span>
            {BENGALURU_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={async () => {
                  if (leafletMap.current && markerRef.current) {
                    leafletMap.current.setView([preset.lat, preset.lng], 16);
                    markerRef.current.setLatLng([preset.lat, preset.lng]);
                  }
                  if (modalLeafletMap.current && modalMarkerRef.current) {
                    modalLeafletMap.current.setView([preset.lat, preset.lng], 16);
                    modalMarkerRef.current.setLatLng([preset.lat, preset.lng]);
                  }
                  await updateLocationState(preset.lat, preset.lng);
                }}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 transition-all cursor-pointer shadow-2xs"
              >
                📍 {preset.name}
              </button>
            ))}
          </div>

          {/* Search Dropdown */}
          <LocationSuggestionDropdown
            id="asset-location-search-dropdown"
            suggestions={searchResults}
            selectedIndex={selectedSuggestionIndex}
            onSelect={selectSearchResult}
            onHover={(idx) => setSelectedSuggestionIndex(idx)}
            pinColor="blue"
          />
        </div>
      )}

      {/* Main Map Container */}
      <div className="relative h-56 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner bg-slate-200 z-0">
        <div ref={mapRef} className="h-full w-full z-0" />

        {/* Overlay info */}
        <div className="absolute top-2 left-2 z-[400] rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-md flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span>{readOnly ? 'Asset Site Location' : 'Click or drag pin to mark asset location'}</span>
        </div>

        {/* Tile Layer Toggle */}
        <div className="absolute top-2 right-2 z-[400] flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMapLayer((prev) => (prev === 'osm' ? 'satellite' : 'osm'))}
            className="flex items-center gap-1 rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-900 shadow-md cursor-pointer transition-all"
          >
            <Layers className="h-3 w-3 text-amber-400" />
            <span>{mapLayer === 'osm' ? 'Satellite' : 'Map View'}</span>
          </button>
        </div>

        {geocoding && (
          <div className="absolute bottom-2 right-2 z-[400] rounded-lg bg-slate-900/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-blue-300 shadow-md flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
            <span>Updating address...</span>
          </div>
        )}
      </div>

      {/* GPS Location Panel (as requested in prompt) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
          <Compass className="h-3.5 w-3.5 text-blue-600" />
          GPS Location Coordinates & Address
        </p>

        <div className="grid gap-2.5 sm:grid-cols-12 text-xs">
          <div className="sm:col-span-3 rounded-lg bg-slate-50 border border-slate-100 p-2">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Latitude</span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {position[0] ? position[0].toFixed(6) : 'Not Pinned'}
            </span>
          </div>

          <div className="sm:col-span-3 rounded-lg bg-slate-50 border border-slate-100 p-2">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Longitude</span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {position[1] ? position[1].toFixed(6) : 'Not Pinned'}
            </span>
          </div>

          <div className="sm:col-span-6 rounded-lg bg-slate-50 border border-slate-100 p-2">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Geocoded Address</span>
            <span className="font-semibold text-slate-800 text-xs truncate block">
              {addressInput || 'Select point on map'}
            </span>
          </div>
        </div>
      </div>

      {/* FULL SCREEN MAP MODAL */}
      {isFullMapOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-md p-2 sm:p-6 animate-fade-in">
          <div className="flex flex-col h-full w-full max-w-7xl mx-auto rounded-2xl bg-white overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Infrastructure Asset Map</span>
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-extrabold text-blue-300">
                      OpenStreetMap
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Full interactive location view
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <span>Open OSM</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
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

            {/* Modal Controls */}
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/90 px-4 py-2.5">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (searchResults.length > 0) {
                            setSelectedSuggestionIndex((prev) => (prev + 1) % searchResults.length);
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (searchResults.length > 0) {
                            setSelectedSuggestionIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
                          }
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (searchResults.length > 0 && selectedSuggestionIndex >= 0 && searchResults[selectedSuggestionIndex]) {
                            selectSearchResult(searchResults[selectedSuggestionIndex]);
                          } else {
                            handleSearchAddress();
                          }
                        } else if (e.key === 'Escape') {
                          setSearchResults([]);
                          setSelectedSuggestionIndex(-1);
                        }
                      }}
                      placeholder="Search location in map..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#172033] pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                    <LocationSuggestionDropdown
                      id="asset-modal-location-search-dropdown"
                      suggestions={searchResults}
                      selectedIndex={selectedSuggestionIndex}
                      onSelect={selectSearchResult}
                      onHover={(idx) => setSelectedSuggestionIndex(idx)}
                      pinColor="blue"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearchAddress()}
                    disabled={searching || !searchQuery.trim()}
                    className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectLiveLocation}
                    disabled={locating}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                    <span>{locating ? 'Locating...' : 'Live GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMapLayer((prev) => (prev === 'osm' ? 'satellite' : 'osm'))}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    <span>{mapLayer === 'osm' ? 'Satellite' : 'Map View'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Map Canvas */}
            <div className="relative flex-1 w-full bg-slate-200 z-0">
              <div ref={modalMapRef} className="h-full w-full z-0" />
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">
                  {addressInput || `Lat: ${position[0]}, Lng: ${position[1]}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-blue-400 font-bold">
                  [{position[0]}, {position[1]}]
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullMapOpen(false)}
                  className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer shadow-md"
                >
                  Confirm & Close Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
