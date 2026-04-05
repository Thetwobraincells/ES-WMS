/**
 * Geofence validation service.
 * Uses the Haversine formula to calculate distance between two GPS coordinates.
 */

const EARTH_RADIUS_METERS = 6_371_000; // Earth's mean radius in metres

/**
 * Calculate the distance in meters between two lat/lng points using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if a point is within the geofence radius of a target point.
 * Default radius: 50 meters (from PRD FR-DRV-11).
 */
export function isWithinGeofence(
  photoLat: number,
  photoLng: number,
  stopLat: number,
  stopLng: number,
  radiusMeters = 50
): { valid: boolean; distanceMeters: number } {
  const distance = haversineDistance(photoLat, photoLng, stopLat, stopLng);

  return {
    valid: distance <= radiusMeters,
    distanceMeters: Math.round(distance * 100) / 100,
  };
}
