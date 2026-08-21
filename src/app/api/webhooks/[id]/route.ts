import { fail, ok } from '@/lib/http'
import { deleteWebhook } from '@/lib/webhook-service'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** `DELETE /api/webhooks/:id` — unregisters a receiver. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const removed = await deleteWebhook(id)
  if (!removed) return fail('No webhook with that id', 404)

  return ok({ deleted: id })
}
