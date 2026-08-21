/**
 * Webhook subscriptions — the server-to-server half of the live feed.
 *
 * SSE only reaches a client that is holding a connection open: a browser tab,
 * or a long-lived Node process. That excludes most of the people who want this
 * module — a Flask backend, a serverless function, a Zapier hook, another
 * team's queue. Webhooks reach all of them, and they survive the receiver
 * being restarted.
 *
 * Pure rules only: matching, backoff, and the disable policy. Signing and
 * delivery are I/O and live in `lib/webhook-service.ts`.
 */

export interface WebhookSubscription {
  id: string
  /** Receiver endpoint. Must be http(s). */
  url: string
  /**
   * Event names to deliver. Supports a trailing wildcard, so `alert.*` takes
   * every alert event and `*` takes everything.
   */
  events: string[]
  /**
   * Shared secret used to sign each delivery. Returned once at registration
   * and never again — the receiver stores it, we only ever compare with it.
   */
  secret: string
  createdAt: string
  /** Consecutive failures. Reset to zero by any success. */
  failureCount: number
  /** Set once the endpoint has failed too many times in a row. */
  disabledAt: string | null
}

/** Collection name shared by the routes and the delivery service. */
export const WEBHOOK_COLLECTION = 'webhooks'

/**
 * Consecutive failures tolerated before a subscription is switched off.
 *
 * A permanently dead endpoint must not be retried on every broadcast forever:
 * during an emergency the outbound queue is competing with the alerts that
 * matter.
 */
export const MAX_FAILURES_BEFORE_DISABLE = 5

/** Per-delivery timeout. A slow receiver must never delay an alert. */
export const DELIVERY_TIMEOUT_MS = 4000

/**
 * Whether a subscription wants this event.
 *
 * @example
 * matchesEvent(['alert.*'], 'alert.created') // => true
 * matchesEvent(['alert.created'], 'alert.acked') // => false
 * matchesEvent(['*'], 'anything') // => true
 */
export function matchesEvent(patterns: readonly string[], eventType: string): boolean {
  return patterns.some((pattern) => {
    if (pattern === '*') return true
    if (pattern.endsWith('.*')) return eventType.startsWith(pattern.slice(0, -1))
    return pattern === eventType
  })
}

/**
 * Subscriptions that should receive this event: enabled, and matching.
 *
 * @example
 * deliverableTo(subscriptions, 'alert.created').length // => 2
 */
export function deliverableTo(
  subscriptions: readonly WebhookSubscription[],
  eventType: string,
): WebhookSubscription[] {
  return subscriptions.filter(
    (subscription) =>
      subscription.disabledAt === null && matchesEvent(subscription.events, eventType),
  )
}

/**
 * The subscription after a delivery attempt, disabling it once it has failed
 * too many times in a row. Any success clears the count — a receiver that
 * recovers is not punished for an earlier outage.
 *
 * @example
 * recordDelivery(subscription, false).failureCount // => 1
 * recordDelivery({ ...subscription, failureCount: 4 }, false).disabledAt // => an ISO string
 */
export function recordDelivery(
  subscription: WebhookSubscription,
  succeeded: boolean,
  at: Date = new Date(),
): WebhookSubscription {
  if (succeeded) return { ...subscription, failureCount: 0, disabledAt: null }

  const failureCount = subscription.failureCount + 1
  return {
    ...subscription,
    failureCount,
    disabledAt:
      failureCount >= MAX_FAILURES_BEFORE_DISABLE
        ? (subscription.disabledAt ?? at.toISOString())
        : subscription.disabledAt,
  }
}

/**
 * The subscription as the API returns it — the secret is shown once at
 * registration and never echoed again.
 *
 * @example
 * 'secret' in publicSubscription(subscription) // => false
 */
export function publicSubscription(
  subscription: WebhookSubscription,
): Omit<WebhookSubscription, 'secret'> {
  const { secret: _secret, ...visible } = subscription
  return visible
}

/**
 * Whether a URL is a usable receiver. Only the scheme is checked here —
 * anything more is the caller's policy, not a property of the URL.
 *
 * @example
 * isDeliverableUrl('https://example.com/hooks/aegis') // => true
 * isDeliverableUrl('javascript:alert(1)') // => false
 */
export function isDeliverableUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
