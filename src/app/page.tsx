import { DispatcherForm } from '@/components/DispatcherForm'
import { ListenerPanel } from '@/components/ListenerPanel'
import { config } from '@/lib/config'
import { storageBackend } from '@/store'

/** Roughly 100 metres in decimal degrees — mirrors the offsets used when seeding. */
const HUNDRED_METRES = 0.0009

export default function ConsolePage() {
  const { campusCentre } = config

  const insideLocation = campusCentre
  const outsideLocation = {
    lat: campusCentre.lat + 6 * HUNDRED_METRES,
    lng: campusCentre.lng + 4 * HUNDRED_METRES,
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-ops-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            SIREN <span className="text-ops-muted">/ geofenced alert &amp; broadcast</span>
          </h1>
          <p className="mt-1 text-xs text-ops-muted">
            Broadcast below and watch it reach only the device inside the radius.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-ops-muted">
          <span className="rounded border border-ops-border px-2 py-1 font-mono">
            storage: {storageBackend}
          </span>
          <a href="/widget" className="rounded border border-ops-border px-2 py-1 hover:border-ops-accent hover:text-ops-accent">
            /widget ↗
          </a>
        </div>
      </header>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <DispatcherForm campusCentre={campusCentre} />

        <div className="grid min-h-[26rem] gap-3 sm:grid-cols-2">
          <ListenerPanel
            title="INSIDE GEOFENCE"
            subtitle="Central Library · at incident centre"
            subscriberId="sub-library"
            location={insideLocation}
          />
          <ListenerPanel
            title="OUTSIDE GEOFENCE"
            subtitle="Sports Ground · ~720m away"
            subscriberId="sub-far-field"
            location={outsideLocation}
          />
        </div>
      </div>

      <section className="rounded-lg border border-ops-border bg-ops-panel p-4">
        <h2 className="text-xs font-bold tracking-wide">INTEGRATE IN TEN MINUTES</h2>
        <p className="mt-1 text-[11px] text-ops-muted">
          Three delivery formats — call the REST API from any language, embed{' '}
          <code className="text-ops-accent">/widget</code> in an iframe, or drop the React component
          in. No API key, no database, no build step.
        </p>

        <pre className="mt-3 overflow-x-auto rounded bg-ops-bg p-3 text-[11px] leading-relaxed text-ops-muted">
          <code>{`curl -X POST http://localhost:4101/api/alerts \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "Fire alarm — Block C",
    "message": "Evacuate via the east stairwell.",
    "severity": "P0",
    "geofence": { "lat": ${campusCentre.lat}, "lng": ${campusCentre.lng}, "radiusM": 300 },
    "escalation": [{ "afterSec": 60, "toChannels": ["sms"] }]
  }'`}</code>
        </pre>
      </section>
    </main>
  )
}
