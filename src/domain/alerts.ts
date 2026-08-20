import { isInsideGeofence } from './geo'
import type { Alert, Geofence, Subscriber } from './types'

/**
 * Fingerprint identifying "the same broadcast". Two alerts with identical text
 * aimed at the same rounded location collapse into one, which stops a panicking
 * dispatcher from spamming the same evacuation notice five times.
 *
 * Coordinates are rounded to ~11m so that trivial GPS jitter still dedupes.
 */
export function buildDedupeKey(title: string, message: string, geofence: Geofence | null): string {
  const area = geofence
    ? `${geofence.lat.toFixed(4)}:${geofence.lng.toFixed(4)}:${geofence.radiusM}`
    : 'campus-wide'

  return `${title.trim().toLowerCase()}|${message.trim().toLowerCase()}|${area}`
}

/**
 * The most recent alert sharing `dedupeKey` within the window, if any.
 * Callers return this instead of creating a duplicate.
 */
export function findRecentDuplicate(
  alerts: readonly Alert[],
  dedupeKey: string,
  now: Date,
  windowSec: number,
): Alert | null {
  const cutoff = now.getTime() - windowSec * 1000

  const duplicate = alerts
    .filter((alert) => alert.dedupeKey === dedupeKey)
    .find((alert) => new Date(alert.createdAt).getTime() >= cutoff)

  return duplicate ?? null
}

/**
 * Subscribers who should receive an alert — those physically inside its geofence.
 *
 * @example
 * selectTargets(subscribers, { lat: 20.3549, lng: 85.8168, radiusM: 300 })
 */
export function selectTargets(
  subscribers: readonly Subscriber[],
  geofence: Geofence | null,
): Subscriber[] {
  return subscribers.filter((subscriber) => isInsideGeofence(subscriber.location, geofence))
}

/**
 * Guards against a runaway client flooding the campus. Counts alerts raised in
 * the last minute against `maxPerMinute`.
 */
export function isThrottled(alerts: readonly Alert[], now: Date, maxPerMinute: number): boolean {
  const oneMinuteAgo = now.getTime() - 60_000
  const recentCount = alerts.filter(
    (alert) => new Date(alert.createdAt).getTime() >= oneMinuteAgo,
  ).length

  return recentCount >= maxPerMinute
}

/** Fraction of targeted subscribers who have acknowledged, in the range 0–1. */
export function acknowledgementRate(alert: Alert): number {
  if (alert.targetedSubscriberIds.length === 0) return 0
  return alert.acknowledgedBy.length / alert.targetedSubscriberIds.length
}

/** Whether an alert's time-to-live has elapsed. */
export function isExpired(alert: Alert, now: Date): boolean {
  return new Date(alert.expiresAt).getTime() <= now.getTime()
}
