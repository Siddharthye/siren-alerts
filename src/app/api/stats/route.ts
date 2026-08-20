import { getStats } from '@/lib/alert-service'
import { ok } from '@/lib/http'
import { storageBackend } from '@/store'

export const dynamic = 'force-dynamic'

/** `GET /api/stats` — headline counters for dashboards. */
export async function GET() {
  return ok({ ...(await getStats()), storageBackend })
}
