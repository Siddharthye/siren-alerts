import type { Coordinates, Geofence } from './types'

const EARTH_RADIUS_M = 6_371_000

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * Great-circle distance between two points, in metres.
 *
 * @example
 * distanceInMetres({ lat: 20.3549, lng: 85.8168 }, { lat: 20.3560, lng: 85.8170 })
 * // => 123.4
 */
export function distanceInMetres(from: Coordinates, to: Coordinates): number {
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine))
}

/**
 * Whether a point falls inside a geofence. A `null` fence means campus-wide,
 * so every point qualifies.
 *
 * @example
 * isInsideGeofence({ lat: 20.3549, lng: 85.8168 }, { lat: 20.3549, lng: 85.8168, radiusM: 300 })
 * // => true
 */
export function isInsideGeofence(point: Coordinates, fence: Geofence | null): boolean {
  if (fence === null) return true
  return distanceInMetres(point, fence) <= fence.radiusM
}
