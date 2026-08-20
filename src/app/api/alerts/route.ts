import { createAlert, listAlerts } from '@/lib/alert-service'
import { fail, ok, parseBody } from '@/lib/http'
import { createAlertSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * `GET /api/alerts?active=true`
 * Lists alerts, newest first. `active=true` hides expired ones.
 */
export async function GET(request: Request) {
  const activeOnly = new URL(request.url).searchParams.get('active') === 'true'
  const alerts = await listAlerts({ activeOnly })

  return ok({ alerts, count: alerts.length })
}

/**
 * `POST /api/alerts`
 * Raises a broadcast. Identical alerts within the dedupe window collapse into
 * the original rather than notifying everyone twice.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, createAlertSchema)
  if (!parsed.success) return parsed.response

  const result = await createAlert(parsed.data)

  if (result.outcome === 'throttled') {
    return fail('Rate limit exceeded — too many alerts in the last minute', 429)
  }

  return ok(
    {
      alertId: result.alert.id,
      deduplicated: result.outcome === 'deduplicated',
      targeted: result.targeted,
      alert: result.alert,
    },
    result.outcome === 'created' ? 201 : 200,
  )
}
