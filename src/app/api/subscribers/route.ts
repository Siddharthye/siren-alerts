import { listSubscribers, upsertSubscriber } from '@/lib/alert-service'
import { ok, parseBody } from '@/lib/http'
import { upsertSubscriberSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/** `GET /api/subscribers` — everyone currently registered to receive alerts. */
export async function GET() {
  const subscribers = await listSubscribers()
  return ok({ subscribers, count: subscribers.length })
}

/**
 * `POST /api/subscribers`
 * Registers a device or moves an existing one. Call this whenever the user's
 * location changes so geofenced broadcasts stay accurate.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, upsertSubscriberSchema)
  if (!parsed.success) return parsed.response

  const subscriber = await upsertSubscriber(parsed.data)
  return ok({ subscriber }, 201)
}
