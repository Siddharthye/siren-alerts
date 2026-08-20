import { isInsideGeofence } from '@/domain/geo'
import type { Alert, Coordinates } from '@/domain/types'
import { store, type StreamEvent } from '@/store'

export const dynamic = 'force-dynamic'

/** How often the event log is checked for new entries. */
const POLL_INTERVAL_MS = 500

/** Silence after which a comment frame is sent to keep proxies from closing us. */
const HEARTBEAT_INTERVAL_MS = 15_000

/**
 * Streams are closed deliberately a little under a typical serverless function
 * limit. `EventSource` reconnects on its own and replays the `Last-Event-ID`
 * header, so a rotation is invisible to the client and loses no events.
 */
const STREAM_LIFETIME_MS = 50_000

/**
 * Alerts are geofenced, so a listener only receives broadcasts that physically
 * reach them. Events other than new alerts are always relevant.
 */
function isRelevantToListener(event: StreamEvent, listener: Coordinates | null): boolean {
  if (event.type !== 'alert.created' || listener === null) return true

  const alert = event.payload as Alert
  return isInsideGeofence(listener, alert.geofence)
}

function readListenerLocation(params: URLSearchParams): Coordinates | null {
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

/**
 * `GET /api/events?lat=&lng=&since=`
 *
 * Server-sent events carrying live alert activity. Pass `lat`/`lng` to receive
 * only alerts whose geofence contains you; omit them to receive everything.
 *
 * @example
 * const stream = new EventSource('http://localhost:4101/api/events?lat=20.3536&lng=85.8195')
 * stream.addEventListener('alert.created', (e) => console.log(JSON.parse(e.data)))
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const listener = readListenerLocation(params)

  const resumeFrom = Number(request.headers.get('last-event-id') ?? params.get('since') ?? 0)
  let cursor = Number.isFinite(resumeFrom) && resumeFrom > 0 ? resumeFrom : await store.latestEventId()

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const startedAt = Date.now()
      let lastFrameAt = Date.now()

      const close = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed by the runtime — nothing to do.
        }
      }

      const write = (frame: string) => {
        if (closed) return
        controller.enqueue(encoder.encode(frame))
        lastFrameAt = Date.now()
      }

      request.signal.addEventListener('abort', close)

      // Tell the client how quickly to come back after a rotation.
      write('retry: 1000\n\n')

      while (!closed && !request.signal.aborted && Date.now() - startedAt < STREAM_LIFETIME_MS) {
        const events = await store.readEventsSince(cursor)

        for (const event of events) {
          cursor = Math.max(cursor, event.id)
          if (!isRelevantToListener(event, listener)) continue

          write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`)
        }

        if (Date.now() - lastFrameAt >= HEARTBEAT_INTERVAL_MS) write(': heartbeat\n\n')

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }

      close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
