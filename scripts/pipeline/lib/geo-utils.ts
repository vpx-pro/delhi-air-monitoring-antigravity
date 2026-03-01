export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Bounding boxes for Delhi-NCR, Haryana, Punjab
export const DELHI_BBOX: BoundingBox = { south: 28.4, north: 28.9, west: 76.8, east: 77.4 };
export const HARYANA_BBOX: BoundingBox = { south: 27.6, north: 30.9, west: 74.5, east: 77.6 };
export const PUNJAB_BBOX: BoundingBox = { south: 29.5, north: 32.5, west: 73.8, east: 76.9 };

// Combined bbox for fire/satellite data covering Delhi + surrounding crop-burning regions
export const NCR_EXTENDED_BBOX: BoundingBox = { south: 28.0, north: 32.5, west: 74.5, east: 78.0 };

export function bboxToString(bbox: BoundingBox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
}

// Haversine distance in km
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
