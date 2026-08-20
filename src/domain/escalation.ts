import { acknowledgementRate } from './alerts'
import type { Alert, Channel } from './types'

/**
 * An alert is considered "answered" once this fraction of targeted subscribers
 * has acknowledged. Below it, the escalation ladder keeps climbing.
 */
const ACKNOWLEDGEMENT_THRESHOLD = 0.5

/**
 * Escalation steps that are now due: their delay has elapsed, they have not
 * fired before, and the alert is still under-acknowledged.
 *
 * Escalation is evaluated *lazily* — on every read of the alert — rather than
 * from a background timer. Serverless functions do not survive between requests,
 * so a `setTimeout` ladder would silently never fire once deployed.
 *
 * @example
 * dueEscalationSteps(alert, new Date()) // => [0, 1]
 */
export function dueEscalationSteps(alert: Alert, now: Date): number[] {
  if (acknowledgementRate(alert) >= ACKNOWLEDGEMENT_THRESHOLD) return []

  const elapsedSec = (now.getTime() - new Date(alert.createdAt).getTime()) / 1000

  return alert.escalation
    .map((step, index) => ({ step, index }))
    .filter(({ step, index }) => elapsedSec >= step.afterSec && !alert.firedEscalationSteps.includes(index))
    .map(({ index }) => index)
}

/**
 * The alert's channel set widened by the given escalation steps, deduplicated.
 *
 * @example
 * channelsAfterEscalation(alert, [0]) // => ['inapp', 'sms']
 */
export function channelsAfterEscalation(alert: Alert, stepIndexes: readonly number[]): Channel[] {
  const widened = stepIndexes.flatMap((index) => alert.escalation[index]?.toChannels ?? [])
  return [...new Set([...alert.channels, ...widened])]
}
