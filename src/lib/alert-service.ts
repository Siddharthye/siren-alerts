import { randomUUID } from 'node:crypto'
import {
  buildDedupeKey,
  findRecentDuplicate,
  isExpired,
  isThrottled,
  selectTargets,
} from '@/domain/alerts'
import { channelsAfterEscalation, dueEscalationSteps } from '@/domain/escalation'
import type { Alert, Channel, Coordinates, EscalationStep, Geofence, Severity, Subscriber } from '@/domain/types'
import { store } from '@/store'
import { config } from './config'
import { seedSubscribers } from './seed'
import { dispatchWebhooks } from './webhook-service'

const ALERTS = 'alerts'
const SUBSCRIBERS = 'subscribers'

export interface CreateAlertInput {
  title: string
  message: string
  severity: Severity
  geofence: Geofence | null
  channels: Channel[]
  escalation: EscalationStep[]
  ttlSec?: number
}

export type CreateAlertResult =
  | { outcome: 'created'; alert: Alert; targeted: number }
  | { outcome: 'deduplicated'; alert: Alert; targeted: number }
  | { outcome: 'throttled' }

/**
 * Seeds demo subscribers the first time the store is read, so a freshly cloned
 * instance is immediately useful instead of showing an empty screen.
 */
async function loadSubscribers(): Promise<Subscriber[]> {
  const existing = await store.readCollection<Subscriber>(SUBSCRIBERS)
  if (existing.length > 0) return existing

  await store.writeCollection(SUBSCRIBERS, seedSubscribers)
  return seedSubscribers
}

/**
 * Fires any escalation steps that have come due and records them, returning the
 * updated alerts. Called on every read — see `dueEscalationSteps` for why this
 * is evaluated lazily rather than on a timer.
 */
async function applyPendingEscalations(alerts: Alert[], now: Date): Promise<Alert[]> {
  let changed = false

  const updated = await Promise.all(
    alerts.map(async (alert) => {
      if (isExpired(alert, now)) return alert

      const dueSteps = dueEscalationSteps(alert, now)
      if (dueSteps.length === 0) return alert

      changed = true
      const escalated: Alert = {
        ...alert,
        channels: channelsAfterEscalation(alert, dueSteps),
        firedEscalationSteps: [...alert.firedEscalationSteps, ...dueSteps],
      }

      const escalation = {
        alertId: alert.id,
        steps: dueSteps,
        channels: escalated.channels,
      }
      void dispatchWebhooks('alert.escalated', escalation)
      await store.appendEvent('alert.escalated', escalation)

      return escalated
    }),
  )

  if (changed) await store.writeCollection(ALERTS, updated)
  return updated
}

/** All alerts, with due escalations applied. Pass `activeOnly` to hide expired ones. */
export async function listAlerts({ activeOnly = false } = {}): Promise<Alert[]> {
  const now = new Date()
  const alerts = await applyPendingEscalations(await store.readCollection<Alert>(ALERTS), now)

  const visible = activeOnly ? alerts.filter((alert) => !isExpired(alert, now)) : alerts
  return visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Raises a broadcast: rejects floods, collapses duplicates, resolves who is
 * inside the geofence, and publishes to the live event stream.
 *
 * @example
 * await createAlert({
 *   title: 'Fire alarm — Block C',
 *   message: 'Evacuate via the east stairwell.',
 *   severity: 'P0',
 *   geofence: { lat: 20.3536, lng: 85.8195, radiusM: 300 },
 *   channels: ['inapp'],
 *   escalation: [{ afterSec: 60, toChannels: ['sms'] }],
 * })
 */
export async function createAlert(input: CreateAlertInput): Promise<CreateAlertResult> {
  const now = new Date()
  const alerts = await store.readCollection<Alert>(ALERTS)

  if (isThrottled(alerts, now, config.maxAlertsPerMinute)) {
    return { outcome: 'throttled' }
  }

  const dedupeKey = buildDedupeKey(input.title, input.message, input.geofence)
  const duplicate = findRecentDuplicate(alerts, dedupeKey, now, config.dedupeWindowSec)
  if (duplicate) {
    return { outcome: 'deduplicated', alert: duplicate, targeted: duplicate.targetedSubscriberIds.length }
  }

  const targets = selectTargets(await loadSubscribers(), input.geofence)
  const ttlSec = input.ttlSec ?? config.defaultTtlSec

  const alert: Alert = {
    id: randomUUID(),
    title: input.title,
    message: input.message,
    severity: input.severity,
    geofence: input.geofence,
    channels: input.channels,
    escalation: input.escalation,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSec * 1000).toISOString(),
    dedupeKey,
    targetedSubscriberIds: targets.map((target) => target.id),
    acknowledgedBy: [],
    firedEscalationSteps: [],
  }

  await store.writeCollection(ALERTS, [...alerts, alert])
  void dispatchWebhooks('alert.created', alert)
  await store.appendEvent('alert.created', alert)

  return { outcome: 'created', alert, targeted: targets.length }
}

/** Records an acknowledgement. Returns `null` if the alert does not exist. */
export async function acknowledgeAlert(alertId: string, subscriberId: string): Promise<Alert | null> {
  const alerts = await store.readCollection<Alert>(ALERTS)
  const target = alerts.find((alert) => alert.id === alertId)
  if (!target) return null

  if (target.acknowledgedBy.includes(subscriberId)) return target

  const updated: Alert = { ...target, acknowledgedBy: [...target.acknowledgedBy, subscriberId] }
  await store.writeCollection(ALERTS, alerts.map((alert) => (alert.id === alertId ? updated : alert)))
  void dispatchWebhooks('alert.acknowledged', { alertId, subscriberId })
  await store.appendEvent('alert.acknowledged', { alertId, subscriberId })

  return updated
}

export async function listSubscribers(): Promise<Subscriber[]> {
  return loadSubscribers()
}

/** Registers or moves a subscriber. Location updates keep geofencing accurate. */
export async function upsertSubscriber(input: {
  id: string
  label?: string
  location: Coordinates
  channels?: Channel[]
}): Promise<Subscriber> {
  const subscribers = await loadSubscribers()
  const existing = subscribers.find((subscriber) => subscriber.id === input.id)

  const subscriber: Subscriber = {
    id: input.id,
    label: input.label ?? existing?.label ?? input.id,
    location: input.location,
    channels: input.channels ?? existing?.channels ?? ['inapp'],
    lastSeenAt: new Date().toISOString(),
  }

  const next = existing
    ? subscribers.map((item) => (item.id === input.id ? subscriber : item))
    : [...subscribers, subscriber]

  await store.writeCollection(SUBSCRIBERS, next)
  await store.appendEvent('subscriber.updated', subscriber)

  return subscriber
}

/** Headline counters for dashboards and the widget. */
export async function getStats() {
  const now = new Date()
  const [alerts, subscribers] = await Promise.all([listAlerts(), listSubscribers()])
  const active = alerts.filter((alert) => !isExpired(alert, now))

  const totalTargeted = alerts.reduce((sum, alert) => sum + alert.targetedSubscriberIds.length, 0)
  const totalAcknowledged = alerts.reduce((sum, alert) => sum + alert.acknowledgedBy.length, 0)

  return {
    activeAlerts: active.length,
    totalAlerts: alerts.length,
    subscribers: subscribers.length,
    totalTargeted,
    totalAcknowledged,
    acknowledgementRate: totalTargeted === 0 ? 0 : totalAcknowledged / totalTargeted,
  }
}
