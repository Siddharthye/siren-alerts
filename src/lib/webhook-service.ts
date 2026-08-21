import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import {
  DELIVERY_TIMEOUT_MS,
  deliverableTo,
  recordDelivery,
  WEBHOOK_COLLECTION,
  type WebhookSubscription,
} from '@/domain/webhook'
import { store } from '@/store'

/**
 * Webhook registration and delivery.
 *
 * Delivery is deliberately fire-and-forget: an alert is not held while a
 * subscriber's server thinks about it. Every attempt is bounded by a timeout,
 * failures are counted, and an endpoint that keeps failing is switched off
 * rather than retried forever.
 */

const loadSubscriptions = (): Promise<WebhookSubscription[]> =>
  store.readCollection<WebhookSubscription>(WEBHOOK_COLLECTION)

const saveSubscriptions = (subscriptions: readonly WebhookSubscription[]): Promise<void> =>
  store.writeCollection(WEBHOOK_COLLECTION, subscriptions)

/**
 * HMAC-SHA256 of the exact body we send, hex encoded.
 *
 * Sent as `X-Siren-Signature`. A receiver recomputes it with the shared secret
 * to prove the payload came from this service and was not altered in transit —
 * which matters because a webhook endpoint is, by construction, a public URL
 * anyone can POST to.
 *
 * @example
 * signBody('s3cret', '{"hello":"world"}') // => 'a1b2c3…'
 */
export function signBody(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Registers a receiver. The generated secret is returned **once**, in this
 * call's response — it is never echoed by any later read.
 *
 * @example
 * const { subscription, secret } = await registerWebhook('https://example.com/hooks', ['alert.*'])
 */
export async function registerWebhook(
  url: string,
  events: string[],
): Promise<{ subscription: WebhookSubscription; secret: string }> {
  const secret = randomBytes(24).toString('hex')
  const subscription: WebhookSubscription = {
    id: `wh-${randomUUID().slice(0, 8)}`,
    url,
    events,
    secret,
    createdAt: new Date().toISOString(),
    failureCount: 0,
    disabledAt: null,
  }

  await saveSubscriptions([...(await loadSubscriptions()), subscription])
  return { subscription, secret }
}

export async function listWebhooks(): Promise<WebhookSubscription[]> {
  return loadSubscriptions()
}

/** Removes a subscription. Returns false when it was already gone. */
export async function deleteWebhook(id: string): Promise<boolean> {
  const subscriptions = await loadSubscriptions()
  const remaining = subscriptions.filter((subscription) => subscription.id !== id)
  if (remaining.length === subscriptions.length) return false

  await saveSubscriptions(remaining)
  return true
}

async function deliverOne(
  subscription: WebhookSubscription,
  body: string,
  eventType: string,
): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

  try {
    const response = await fetch(subscription.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Siren-Event': eventType,
        'X-Siren-Delivery': subscription.id,
        'X-Siren-Signature': signBody(subscription.secret, body),
      },
      body,
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Delivers one event to every matching, enabled subscription, in parallel.
 *
 * Awaiting this is optional and usually wrong: callers raising an alert should
 * not block on a subscriber's server. The failure bookkeeping still runs, so a
 * consistently dead endpoint eventually disables itself.
 *
 * @example
 * void dispatchWebhooks('alert.created', alert)
 */
export async function dispatchWebhooks(eventType: string, payload: unknown): Promise<void> {
  const subscriptions = await loadSubscriptions()
  const targets = deliverableTo(subscriptions, eventType)
  if (targets.length === 0) return

  const body = JSON.stringify({ event: eventType, at: new Date().toISOString(), data: payload })
  const results = await Promise.all(
    targets.map(async (subscription) => ({
      id: subscription.id,
      succeeded: await deliverOne(subscription, body, eventType),
    })),
  )

  const outcomeById = new Map(results.map((result) => [result.id, result.succeeded]))
  await saveSubscriptions(
    subscriptions.map((subscription) => {
      const succeeded = outcomeById.get(subscription.id)
      return succeeded === undefined ? subscription : recordDelivery(subscription, succeeded)
    }),
  )
}
