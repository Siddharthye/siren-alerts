import { ok } from '@/lib/http'
import { storageBackend } from '@/store'

export const dynamic = 'force-dynamic'

/** `GET /api/health` — liveness probe. Buyers use this to confirm wiring. */
export async function GET() {
  return ok({
    service: 'siren-alerts',
    status: 'ok',
    storageBackend,
    at: new Date().toISOString(),
  })
}
