/**
 * Core vocabulary for SIREN. Everything in `domain/` is pure data and pure
 * functions — no I/O, no framework imports — so the logic stays testable and
 * readable independently of how it is served.
 */

/** Incident priority. P0 is life-threatening; P3 is informational. */
export type Severity = 'P0' | 'P1' | 'P2' | 'P3'

/** Delivery surfaces an alert can be pushed to. */
export type Channel = 'inapp' | 'push' | 'sms' | 'email' | 'webhook'

export interface Coordinates {
  lat: number
  lng: number
}

/** A circular target area. Alerts reach only subscribers inside it. */
export interface Geofence extends Coordinates {
  radiusM: number
}

/**
 * One rung of the escalation ladder: if an alert is still unacknowledged
 * `afterSec` seconds after creation, widen delivery to `toChannels`.
 */
export interface EscalationStep {
  afterSec: number
  toChannels: Channel[]
  note?: string
}

export interface Alert {
  id: string
  title: string
  message: string
  severity: Severity
  /** `null` means campus-wide — no geographic filtering. */
  geofence: Geofence | null
  channels: Channel[]
  escalation: EscalationStep[]
  createdAt: string
  expiresAt: string
  /** Stable fingerprint used to collapse repeat broadcasts. See `buildDedupeKey`. */
  dedupeKey: string
  targetedSubscriberIds: string[]
  acknowledgedBy: string[]
  /** Indexes of escalation steps already fired, so each fires exactly once. */
  firedEscalationSteps: number[]
}

export interface Subscriber {
  id: string
  label: string
  location: Coordinates
  channels: Channel[]
  lastSeenAt: string
}
