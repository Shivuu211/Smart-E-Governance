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
  ShieldAlert,
} from 'lucide-react';
import {
  detectZoneFromCoordsAndAddress,
  isLocationInZone,
  BENGALURU_ZONES,
  isValidCoordinate,
} from '../utils/zoneUtils';
import LocationSuggestionDropdown from './LocationSuggestionDropdown';

// Default center: Vidhana Soudha / MG Road, Bengaluru Central
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

// Popular Bengaluru Neighborhood Presets by Zone
const ZONE_PRESETS: Record<string, Array<{ name: string; lat: number; lng: number }>> = {
  'Bengaluru South': [
    { name: 'JP Nagar 6th Phase', lat: 12.9063, lng: 77.5857 },
    { name: 'Jayanagar 4th Block', lat: 12.9250, lng: 77.5938 },
    { name: 'BTM Layout 2nd Stage', lat: 12.9166, lng: 77.6101 },
    { name: 'Banashankari 3rd Stage', lat: 12.9250, lng: 77.5460 },
    { name: 'Gollahalli Cross', lat: 12.8912, lng: 77.5811 },
    { name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
  ],
  'Bengaluru North': [
    { name: 'Yelahanka New Town', lat: 13.1007, lng: 77.5963 },
    { name: 'Hebbal Flyover', lat: 13.0358, lng: 77.5970 },
    { name: 'Sahakarnagar Main', lat: 13.0620, lng: 77.5900 },
    { name: 'Mathikere Ward 4', lat: 13.0300, lng: 77.5600 },
  ],
  'Bengaluru East': [
    { name: 'Whitefield Main Rd', lat: 12.9698, lng: 77.7499 },
    { name: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408 },
    { name: 'Marathahalli Junction', lat: 12.9560, lng: 77.7010 },
    { name: 'Hoodi Ward 8', lat: 12.9920, lng: 77.7150 },
  ],
  'Bengaluru West': [
    { name: 'Kengeri Satellite Town', lat: 12.8990, lng: 77.4820 },
    { name: 'Malleshwaram 18th Cross', lat: 12.9925, lng: 77.5712 },
    { name: 'Rajajinagar 1st Block', lat: 12.9880, lng: 77.5540 },
    { name: 'Vijayanagar Bus Station', lat: 12.9700, lng: 77.5300 },
  ],
};

const BENGALURU_PRESETS = [
  { name: 'JP Nagar (South)', lat: 12.9063, lng: 77.5857 },
  { name: 'Jayanagar (South)', lat: 12.9250, lng: 77.5938 },
  { name: 'Yelahanka (North)', lat: 13.1007, lng: 77.5963 },
  { name: 'Whitefield (East)', lat: 12.9698, lng: 77.7499 },
  { name: 'Kengeri (West)', lat: 12.8990, lng: 77.4820 },
];

// Standard OSM & Esri Satellite Tile URLs
const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Custom SVG Leaflet Marker Icon
const createCustomMarkerIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 16px; height: 16px; background: rgba(225, 29, 72, 0.3); border-radius: 50%; transform: scale(2.2); animation: pulse 1.8s infinite;"></div>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="#e11d48" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.45));">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });
};

interface GrievanceMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  locationAddress: string;
  userZone?: string;
  onChangeLocation: (lat: number, lng: number, address: string) => void;
  onZoneError?: (errMsg: string) => void;
  onValidationChange?: (isValid: boolean, validationMsg: string) => void;
}

export default function GrievanceMapPicker({
  latitude,
  longitude,
  locationAddress,
  userZone = 'Bengaluru South',
  onChangeLocation,
  onZoneError,
  onValidationChange,
}: GrievanceMapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const modalMapRef = useRef<HTMLDivElement | null>(null);

  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const zoneBoundaryRef = useRef<L.Rectangle | null>(null);

  const modalLeafletMap = useRef<L.Map | null>(null);
  const modalMarkerRef = useRef<L.Marker | null>(null);
  const modalTileLayerRef = useRef<L.TileLayer | null>(null);
  const modalZoneBoundaryRef = useRef<L.Rectangle | null>(null);

  const defaultCenterForZone: [number, number] = BENGALURU_ZONES[userZone]?.center || DEFAULT_CENTER;

  const [position, setPosition] = useState<[number, number] | null>(
    isValidCoordinate(latitude, longitude) ? [latitude, longitude] : null
  );

  // Sync state if parent updates or resets latitude/longitude props
  useEffect(() => {
    if (isValidCoordinate(latitude, longitude)) {
      setPosition([latitude, longitude]);
    } else if (latitude === null && longitude === null) {
      setPosition(null);
      if (markerRef.current && leafletMap.current) {
        leafletMap.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (modalMarkerRef.current && modalLeafletMap.current) {
        modalLeafletMap.current.removeLayer(modalMarkerRef.current);
        modalMarkerRef.current = null;
      }
    }
  }, [latitude, longitude]);

  const [addressInput, setAddressInput] = useState(locationAddress || '');
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // UI state
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locSuccess, setLocSuccess] = useState('');
  const [locError, setLocError] = useState('');
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);

  // Search feature state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [searching, setSearching] = useState(false);

  // Active presets list
  const activePresets = ZONE_PRESETS[userZone] || BENGALURU_PRESETS;

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
      if (!isValidCoordinate(lat, lng)) {
        return false;
      }

      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));

      let addrToUse = customAddr;
      if (addrToUse === undefined) {
        addrToUse = await reverseGeocode(roundedLat, roundedLng);
      }

      setPosition([roundedLat, roundedLng]);
      setAddressInput(addrToUse);

      // Place or update marker on inline Leaflet map
      if (leafletMap.current) {
        if (!markerRef.current) {
          const marker = L.marker([roundedLat, roundedLng], {
            icon: createCustomMarkerIcon(),
            draggable: true,
          }).addTo(leafletMap.current);

          marker.on('dragend', async () => {
            const mPos = marker.getLatLng();
            await updateLocationState(mPos.lat, mPos.lng);
          });

          markerRef.current = marker;
        } else {
          markerRef.current.setLatLng([roundedLat, roundedLng]);
        }
      }

      // Place or update marker on modal Leaflet map if open
      if (modalLeafletMap.current) {
        if (!modalMarkerRef.current) {
          const marker = L.marker([roundedLat, roundedLng], {
            icon: createCustomMarkerIcon(),
            draggable: true,
          }).addTo(modalLeafletMap.current);

          marker.on('dragend', async () => {
            const mPos = marker.getLatLng();
            await updateLocationState(mPos.lat, mPos.lng);
          });

          modalMarkerRef.current = marker;
        } else {
          modalMarkerRef.current.setLatLng([roundedLat, roundedLng]);
        }
      }

      // Validate coordinates against citizen's registered zone
      const isValid = isLocationInZone(roundedLat, roundedLng, addrToUse, userZone);

      if (!isValid) {
        const errMsg = 'Please select a location inside your zone.';
        setLocError(errMsg);
        if (onZoneError) onZoneError(errMsg);
        if (onValidationChange) onValidationChange(false, errMsg);
      } else {
        setLocError('');
        if (onZoneError) onZoneError('');
        if (onValidationChange) onValidationChange(true, `Location verified – ${userZone}`);
      }

      onChangeLocation(roundedLat, roundedLng, addrToUse);
      return isValid;
    },
    [onChangeLocation, userZone, onZoneError, onValidationChange]
  );

  // Initialize main inline Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const initialLat = position ? position[0] : defaultCenterForZone[0];
      const initialLng = position ? position[1] : defaultCenterForZone[1];

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: position ? 15 : 13,
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

      // Draw Zone Boundary Rectangle
      const boundsData = BENGALURU_ZONES[userZone];
      if (boundsData) {
        const rectBounds: [[number, number], [number, number]] = [
          [boundsData.minLat, boundsData.minLng],
          [boundsData.maxLat, boundsData.maxLng],
        ];
        const rect = L.rectangle(rectBounds, {
          color: '#2563eb',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          dashArray: '6, 6',
          interactive: false,
        }).addTo(map);

        rect.bindTooltip(`📍 ${userZone} Registered Boundary`, {
          permanent: true,
          direction: 'top',
          className: 'zone-boundary-tooltip',
          interactive: false,
        });

        zoneBoundaryRef.current = rect;
      }

      // Only place marker if initial position is valid and exists
      if (position) {
        const marker = L.marker([initialLat, initialLng], {
          icon: createCustomMarkerIcon(),
          draggable: true,
        }).addTo(map);

        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng();
          await updateLocationState(lat, lng);
        });

        markerRef.current = marker;
      }

      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        await updateLocationState(lat, lng);
      });

      leafletMap.current = map;

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
        zoneBoundaryRef.current = null;
      }
    };
  }, []);

  // Update inline map tile layer on layer change
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
    if (position) {
      if (leafletMap.current) {
        if (!markerRef.current) {
          const marker = L.marker(position, {
            icon: createCustomMarkerIcon(),
            draggable: true,
          }).addTo(leafletMap.current);
          marker.on('dragend', async () => {
            const { lat, lng } = marker.getLatLng();
            await updateLocationState(lat, lng);
          });
          markerRef.current = marker;
        } else {
          markerRef.current.setLatLng(position);
        }
      }
      if (modalLeafletMap.current) {
        if (!modalMarkerRef.current) {
          const marker = L.marker(position, {
            icon: createCustomMarkerIcon(),
            draggable: true,
          }).addTo(modalLeafletMap.current);
          marker.on('dragend', async () => {
            const { lat, lng } = marker.getLatLng();
            await updateLocationState(lat, lng);
          });
          modalMarkerRef.current = marker;
        } else {
          modalMarkerRef.current.setLatLng(position);
        }
      }
    }
  }, [position, updateLocationState]);

  // Initialize Modal Map when full map modal is opened
  useEffect(() => {
    if (isFullMapOpen && modalMapRef.current) {
      if (modalLeafletMap.current) {
        modalLeafletMap.current.remove();
        modalLeafletMap.current = null;
      }

      const modalCenter: [number, number] = position || defaultCenterForZone;

      const map = L.map(modalMapRef.current, {
        center: modalCenter,
        zoom: position ? 16 : 13,
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

      // Draw Zone Boundary Rectangle on Modal Map
      const boundsData = BENGALURU_ZONES[userZone];
      if (boundsData) {
        const rectBounds: [[number, number], [number, number]] = [
          [boundsData.minLat, boundsData.minLng],
          [boundsData.maxLat, boundsData.maxLng],
        ];
        const rect = L.rectangle(rectBounds, {
          color: '#2563eb',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          dashArray: '6, 6',
          interactive: false,
        }).addTo(map);

        rect.bindTooltip(`📍 ${userZone} Registered Boundary`, {
          permanent: true,
          direction: 'top',
          className: 'zone-boundary-tooltip',
          interactive: false,
        });

        modalZoneBoundaryRef.current = rect;
      }

      if (position) {
        const marker = L.marker(position, {
          icon: createCustomMarkerIcon(),
          draggable: true,
        }).addTo(map);

        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng();
          await updateLocationState(lat, lng);
        });

        modalMarkerRef.current = marker;
      }

      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        await updateLocationState(lat, lng);
      });

      modalLeafletMap.current = map;

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
        modalZoneBoundaryRef.current = null;
      }
    };
  }, [isFullMapOpen]);

  // Robust live GPS handler requesting real citizen coordinates
  const handleDetectLiveLocation = useCallback(() => {
    setLocating(true);
    setLocError('');
    setLocSuccess('');

    if (!navigator.geolocation) {
      setLocating(false);
      const errMsg = 'Unable to determine your current location. Please try again or select your location manually.';
      setLocError(errMsg);
      if (onZoneError) onZoneError(errMsg);
      if (onValidationChange) onValidationChange(false, errMsg);
      return;
    }

    const onLocationSuccess = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!isValidCoordinate(lat, lng)) {
        setLocating(false);
        const errMsg = 'Unable to determine your current location. Please try again or select your location manually.';
        setLocError(errMsg);
        if (onZoneError) onZoneError(errMsg);
        if (onValidationChange) onValidationChange(false, errMsg);
        return;
      }

      // Center map at exact coordinates
      if (leafletMap.current) {
        leafletMap.current.setView([lat, lng], 16);
      }
      if (modalLeafletMap.current) {
        modalLeafletMap.current.setView([lat, lng], 16);
      }

      // Update location with actual coordinates without modifying or snapping to zone center
      const inZone = await updateLocationState(lat, lng);
      setLocating(false);

      if (inZone) {
        setLocSuccess(`Live GPS location verified: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°`);
        setTimeout(() => setLocSuccess(''), 6000);
      }
    };

    const handleGeoError = (err: GeolocationPositionError) => {
      setLocating(false);
      let errMsg = '';
      if (err.code === 1) {
        // PERMISSION_DENIED
        errMsg = 'Location permission was denied. Please allow location access or select your location manually.';
      } else if (err.code === 3) {
        // TIMEOUT
        errMsg = 'Location request timed out. Please try again.';
      } else {
        // POSITION_UNAVAILABLE or unknown
        errMsg = 'Unable to determine your current location. Please try again or select your location manually.';
      }
      setLocError(errMsg);
      if (onZoneError) onZoneError(errMsg);
      if (onValidationChange) onValidationChange(false, errMsg);
    };

    // Primary attempt: high accuracy (10s timeout, maxAge: 0)
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      (firstErr) => {
        // If permission was denied, do not retry
        if (firstErr.code === 1) {
          handleGeoError(firstErr);
          return;
        }

        // Retry once with standard accuracy (8s timeout)
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          (retryErr) => {
            handleGeoError(retryErr);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocationState, onZoneError, onValidationChange]);

  // Search Address or Landmark via OSM Nominatim API
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
    if (isValidCoordinate(lat, lng)) {
      if (leafletMap.current) {
        leafletMap.current.setView([lat, lng], 16);
      }
      if (modalLeafletMap.current) {
        modalLeafletMap.current.setView([lat, lng], 16);
      }
      await updateLocationState(lat, lng, item.display_name);
      setSearchResults([]);
      setSelectedSuggestionIndex(-1);
      setSearchQuery('');
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddressInput(val);
    if (position) {
      onChangeLocation(position[0], position[1], val);
    }
  };

  const activeLat = position ? position[0] : defaultCenterForZone[0];
  const activeLng = position ? position[1] : defaultCenterForZone[1];
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${activeLat}&mlon=${activeLng}#map=16/${activeLat}/${activeLng}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold shadow-xs">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Pinpoint Issue Site on Map</span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider">
                Live Map
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Click map, search address, or use Live Location
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live GPS Button */}
          <button
            type="button"
            onClick={handleDetectLiveLocation}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all disabled:opacity-60 shadow-xs cursor-pointer active:scale-95"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
            ) : (
              <Navigation className="h-3.5 w-3.5 text-emerald-700" />
            )}
            <span>{locating ? 'Fetching your current location...' : 'Use My Current Location'}</span>
          </button>

          {/* Open Full Map Button */}
          <button
            type="button"
            onClick={() => setIsFullMapOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-xs cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Open Full Map</span>
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {locating && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-800 border border-blue-200 shadow-2xs animate-fade-in">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
          <span>Fetching your current location...</span>
        </div>
      )}

      {/* Error Banner */}
      {locError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-800 border border-rose-200 shadow-2xs animate-fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{locError}</span>
        </div>
      )}

      {/* Real-time Zone Location Validation Feedback Banners */}
      {!locError && !locating && position && userZone && userZone !== 'All' && userZone !== 'All Areas' && (
        isLocationInZone(position[0], position[1], addressInput, userZone) ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs animate-fade-in">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Location verified – {userZone}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-800 border border-rose-200 shadow-2xs animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>Please select a location inside your zone.</span>
          </div>
        )
      )}

      {!locError && !locating && locSuccess && (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 border border-emerald-200 animate-fade-in">
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{locSuccess}</span>
        </div>
      )}

      {/* Quick Search Address input above inline map */}
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
              placeholder={`Search location in ${userZone} (e.g., JP Nagar, Silk Board)...`}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#172033] pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearchAddress()}
            disabled={searching || !searchQuery.trim()}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Quick Bengaluru Area Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
          <span className="font-bold text-slate-500 text-[10px] shrink-0 uppercase tracking-wider">{userZone} Presets:</span>
          {activePresets.map((preset) => (
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
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition-all cursor-pointer shadow-2xs"
            >
              📍 {preset.name}
            </button>
          ))}
        </div>

        {/* Search Results Dropdown */}
        <LocationSuggestionDropdown
          id="grievance-location-search-dropdown"
          suggestions={searchResults}
          selectedIndex={selectedSuggestionIndex}
          onSelect={selectSearchResult}
          onHover={(idx) => setSelectedSuggestionIndex(idx)}
          pinColor="rose"
        />
      </div>

      {/* Main Map Container */}
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner bg-slate-200 z-0">
        <div ref={mapRef} className="h-full w-full z-0" />

        {/* Floating Instruction overlay */}
        <div className="absolute top-2 left-2 z-[400] rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-md flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Click map or drag pin to select problem site</span>
        </div>

        {/* Layer Switcher & Fullscreen Button Overlay */}
        <div className="absolute top-2 right-2 z-[400] flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMapLayer((prev) => (prev === 'osm' ? 'satellite' : 'osm'))}
            className="flex items-center gap-1 rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-900 shadow-md cursor-pointer transition-all"
            title="Toggle Satellite Imagery"
          >
            <Layers className="h-3 w-3 text-amber-400" />
            <span>{mapLayer === 'osm' ? 'Satellite' : 'Map View'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullMapOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700 shadow-md cursor-pointer transition-all"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Expand</span>
          </button>
        </div>

        {/* Reverse Geocoding Loader */}
        {geocoding && (
          <div className="absolute bottom-2 right-2 z-[400] rounded-lg bg-slate-900/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-emerald-300 shadow-md flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
            <span>Updating address...</span>
          </div>
        )}
      </div>

      {/* Address & Latitude / Longitude input fields */}
      <div className="grid gap-2 sm:grid-cols-12">
        <div className="sm:col-span-8">
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>Selected Address Description / Landmark</span>
            {geocoding && <span className="text-emerald-600 text-[10px]">Updating...</span>}
          </label>
          <input
            type="text"
            value={addressInput}
            onChange={handleAddressChange}
            placeholder="e.g., Near Ward 4 Temple Road, Namma Panchayath"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-medium"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Pinpoint GPS Coords
          </label>
          <div className="flex h-[34px] items-center rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-[11px] font-mono text-slate-700 font-semibold">
            <Compass className="h-3.5 w-3.5 text-emerald-600 mr-1.5 shrink-0" />
            {position ? `${position[0]}, ${position[1]}` : 'Click map or use live location'}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Full Interactive Location Map</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                      OpenStreetMap
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Click anywhere on the full map to set pin or search any site
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* External links */}
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <span>Open in OSM Tab</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <span>Open in Google Maps</span>
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

            {/* Modal Controls Bar */}
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
                    placeholder="Search location in full map..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#172033] pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-[#F8FAFC] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                  <LocationSuggestionDropdown
                    id="grievance-modal-location-search-dropdown"
                    suggestions={searchResults}
                    selectedIndex={selectedSuggestionIndex}
                    onSelect={selectSearchResult}
                    onHover={(idx) => setSelectedSuggestionIndex(idx)}
                    pinColor="rose"
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
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                  <span>{locating ? 'Fetching your current location...' : 'Use My Current Location'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapLayer((prev) => (prev === 'osm' ? 'satellite' : 'osm'))}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  <span>{mapLayer === 'osm' ? 'Satellite View' : 'Map View'}</span>
                </button>
              </div>
            </div>

            {/* Modal Map Canvas */}
            <div className="relative flex-1 w-full bg-slate-200 z-0">
              <div ref={modalMapRef} className="h-full w-full z-0" />
            </div>

            {/* Modal Footer with Selected Address */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">
                  {position
                    ? addressInput || `Lat: ${position[0]}, Lng: ${position[1]}`
                    : 'Click anywhere on the map to place a pin'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {position && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    [{position[0]}, {position[1]}]
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsFullMapOpen(false)}
                  className="rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer shadow-md"
                >
                  Confirm & Use This Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
