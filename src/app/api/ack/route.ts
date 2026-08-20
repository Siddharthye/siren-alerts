import { acknowledgeAlert } from '@/lib/alert-service'
import { fail, ok, parseBody } from '@/lib/http'
import { acknowledgeSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * `POST /api/ack`
 * Marks an alert as seen by one subscriber. Acknowledgement rate is what stops
 * the escalation ladder — see `domain/escalation.ts`.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, acknowledgeSchema)
  if (!parsed.success) return parsed.response

  const alert = await acknowledgeAlert(parsed.data.alertId, parsed.data.subscriberId)
  if (!alert) return fail('Unknown alertId', 404)

  return ok({
    alertId: alert.id,
    acknowledgedBy: alert.acknowledgedBy.length,
    targeted: alert.targetedSubscriberIds.length,
  })
}
