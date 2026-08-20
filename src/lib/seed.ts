import type { Subscriber } from '@/domain/types'
import { config } from './config'

const { lat, lng } = config.campusCentre

/** Roughly 100 metres in decimal degrees at this latitude. */
const HUNDRED_METRES = 0.0009

/**
 * Demo subscribers spread across the campus, deliberately including two who sit
 * outside a 300m geofence. A buyer evaluating SIREN can then see geofencing
 * actually exclude someone on their very first broadcast, rather than having to
 * construct test data themselves.
 */
export const seedSubscribers: Subscriber[] = [
  { id: 'sub-library', label: 'Central Library', offsetLat: 0, offsetLng: 0 },
  { id: 'sub-block-c', label: 'Block C — 3rd Floor', offsetLat: 1, offsetLng: 0.5 },
  { id: 'sub-hostel-7', label: 'Hostel 7 Lobby', offsetLat: -1.2, offsetLng: 0.8 },
  { id: 'sub-canteen', label: 'Main Canteen', offsetLat: 0.7, offsetLng: -1 },
  { id: 'sub-gate-3', label: 'Gate 3 Security', offsetLat: -2, offsetLng: -1.5 },
  { id: 'sub-far-field', label: 'Sports Ground (far)', offsetLat: 6, offsetLng: 4 },
  { id: 'sub-off-campus', label: 'Off-campus Annexe (far)', offsetLat: -8, offsetLng: -6 },
].map(({ id, label, offsetLat, offsetLng }) => ({
  id,
  label,
  location: {
    lat: lat + offsetLat * HUNDRED_METRES,
    lng: lng + offsetLng * HUNDRED_METRES,
  },
  channels: ['inapp' as const],
  lastSeenAt: new Date().toISOString(),
}))
