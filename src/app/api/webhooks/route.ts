import { z } from 'zod'
import { isDeliverableUrl, publicSubscription } from '@/domain/webhook'
import { ok, parseBody } from '@/lib/http'
import { listWebhooks, registerWebhook } from '@/lib/webhook-service'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  url: z.string().refine(isDeliverableUrl, 'url must be an http(s) endpoint'),
  /** Event names, with an optional trailing wildcard. Defaults to everything. */
  events: z.array(z.string().min(1).max(60)).min(1).max(20).default(['*']),
})

/**
 * `GET /api/webhooks`
 * Registered receivers. Secrets are never included.
 */
export async function GET() {
  const subscriptions = await listWebhooks()
  return ok({ webhooks: subscriptions.map(publicSubscription), count: subscriptions.length })
}

/**
 * `POST /api/webhooks { url, events }`
 *
 * Registers a server-to-server receiver. SSE needs a held-open connection;
 * this reaches a backend, a serverless function, or an automation platform,
 * and survives the receiver restarting.
 *
 * The response carries `secret` **once**. Every delivery is signed with it as
 * `X-Siren-Signature` (HMAC-SHA256 of the exact body), so a receiver can prove
 * the payload came from SIREN — necessary because a webhook URL is public by
 * construction.
 *
 * @example
 * curl -X POST http://localhost:4101/api/webhooks \
 *   -H 'Content-Type: application/json' \
 *   -d '{"url":"https://example.com/hooks/siren","events":["alert.*"]}'
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, registerSchema)
  if (!parsed.success) return parsed.response

  const { subscription, secret } = await registerWebhook(parsed.data.url, parsed.data.events)

  return ok(
    {
      webhook: publicSubscription(subscription),
      secret,
      note: 'Store this secret now — it is not returned again. Verify X-Siren-Signature against it.',
    },
    201,
  )
}
