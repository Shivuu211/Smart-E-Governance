export interface ZoneBounds {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  center: [number, number];
  keywords: string[];
}

export const BENGALURU_ZONES: Record<string, ZoneBounds> = {
  'Bengaluru South': {
    name: 'Bengaluru South',
    minLat: 12.8000,
    maxLat: 12.9550,
    minLng: 77.5200,
    maxLng: 77.6500,
    center: [12.9100, 77.5850],
    keywords: ['south', 'jp nagar', 'jayanagar', 'btm', 'electronic city', 'banashankari', 'gollahalli', 'begur', 'hulimavu', 'uttarahalli', 'konanakunte', 'silk board', 'koramangala', 'vajarahalli', 'arekere'],
  },
  'Bengaluru North': {
    name: 'Bengaluru North',
    minLat: 12.9750,
    maxLat: 13.2500,
    minLng: 77.5000,
    maxLng: 77.6500,
    center: [13.0600, 77.5900],
    keywords: ['north', 'yelahanka', 'hebbal', 'sahakarnagar', 'mathikere', 'jalahalli', 'thanisandra', 'chikkajala', 'vidyaranyapura', 'bagalur'],
  },
  'Bengaluru East': {
    name: 'Bengaluru East',
    minLat: 12.9100,
    maxLat: 13.0800,
    minLng: 77.6550,
    maxLng: 77.8500,
    center: [12.9800, 77.7200],
    keywords: ['east', 'whitefield', 'marathahalli', 'kr puram', 'itpl', 'mahadevapura', 'indiranagar', 'hoodi', 'bellandur', 'varthur', 'vimanapura', 'kadugodi'],
  },
  'Bengaluru West': {
    name: 'Bengaluru West',
    minLat: 12.8500,
    maxLat: 12.9700,
    minLng: 77.3500,
    maxLng: 77.5150,
    center: [12.9500, 77.4800],
    keywords: ['west', 'kengeri', 'rajajinagar', 'vijayanagar', 'nagarbhavi', 'malleshwaram', 'peenya', 'rr nagar', 'rajarajeshwari nagar', 'nayandahalli'],
  },
};

export const BENGALURU_OVERALL_BOUNDS = {
  minLat: 12.7500,
  maxLat: 13.3000,
  minLng: 77.3000,
  maxLng: 77.9000,
};

export function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    (lat !== 0 || lng !== 0) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function detectZoneFromCoords(lat: number, lng: number): string {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return 'Unknown';
  }

  // If outside Greater Bengaluru metropolitan region
  if (
    lat < BENGALURU_OVERALL_BOUNDS.minLat ||
    lat > BENGALURU_OVERALL_BOUNDS.maxLat ||
    lng < BENGALURU_OVERALL_BOUNDS.minLng ||
    lng > BENGALURU_OVERALL_BOUNDS.maxLng
  ) {
    return 'Outside Jurisdiction';
  }

  // Pure spatial coordinate boundary checks for Bengaluru Zones
  if (lat >= 12.9650 && lng < 77.6500) {
    return 'Bengaluru North';
  }
  if (lng >= 77.6500) {
    return 'Bengaluru East';
  }
  if (lng < 77.5200 && lat < 12.9650) {
    return 'Bengaluru West';
  }
  if (lng >= 77.5200 && lng < 77.6500 && lat < 12.9650) {
    return 'Bengaluru South';
  }

  // Bounding box check
  for (const [zoneName, zoneData] of Object.entries(BENGALURU_ZONES)) {
    if (lat >= zoneData.minLat && lat <= zoneData.maxLat && lng >= zoneData.minLng && lng <= zoneData.maxLng) {
      return zoneName;
    }
  }

  // Distance fallback to closest zone center within Bengaluru
  let closestZone = 'Bengaluru South';
  let minDistance = Infinity;
  for (const [zoneName, zoneData] of Object.entries(BENGALURU_ZONES)) {
    const dist = Math.hypot(lat - zoneData.center[0], lng - zoneData.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zoneName;
    }
  }
  return closestZone;
}

export function detectZoneFromCoordsAndAddress(lat: number, lng: number, address?: string): string {
  // Always prioritize latitude/longitude coordinates FIRST when valid
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return detectZoneFromCoords(lat, lng);
  }

  // Secondary fallback to address keywords if coordinates are not available
  const addrStr = (address || '').toLowerCase();
  for (const [zoneName, zoneData] of Object.entries(BENGALURU_ZONES)) {
    for (const kw of zoneData.keywords) {
      if (addrStr.includes(kw)) {
        return zoneName;
      }
    }
  }

  return 'Bengaluru South';
}

export function isLocationInZone(lat: number, lng: number, address: string | undefined, userZone: string): boolean {
  if (!userZone || userZone === 'All' || userZone === 'All Areas') return true;
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }

  let targetZone = userZone.trim();
  if (!targetZone.toLowerCase().startsWith('bengaluru') && !targetZone.toLowerCase().includes('zone')) {
    targetZone = `Bengaluru ${targetZone}`;
  }

  const detected = detectZoneFromCoords(lat, lng);
  if (detected === 'Unknown' || detected === 'Outside Jurisdiction') {
    return false;
  }

  const normalize = (z: string) => z.toLowerCase().replace(/bengaluru/g, '').replace(/zone/g, '').trim();
  return normalize(detected) === normalize(targetZone);
}

export const ZONE_DESIGNATION_MAP: Record<string, string> = {
  'Bengaluru South': 'Zone Panchayath Officer',
  'Bengaluru North': 'Zone Panchayath Officer',
  'Bengaluru East': 'Zone Panchayath Officer',
  'Bengaluru West': 'Zone Panchayath Officer',
  'South Zone': 'Zone Panchayath Officer',
  'North Zone': 'Zone Panchayath Officer',
  'East Zone': 'Zone Panchayath Officer',
  'West Zone': 'Zone Panchayath Officer',
  'South': 'Zone Panchayath Officer',
  'North': 'Zone Panchayath Officer',
  'East': 'Zone Panchayath Officer',
  'West': 'Zone Panchayath Officer',
};

/**
 * Standardized zone-to-designation mapping across the Namma Panchayath Management System.
 * Standard role designation: 'Zone Panchayath Officer'
 */
export function getZoneOfficerDesignation(assignedZone?: string): string {
  return 'Zone Panchayath Officer';
}

export function getZoneOfficerTagline(assignedZone?: string): string {
  return getZoneOfficerDesignation(assignedZone);
}
