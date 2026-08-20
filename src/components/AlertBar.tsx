'use client'

import type { Coordinates } from '@/domain/types'
import { useAlertStream } from '@/hooks/use-alert-stream'
import { SeverityBadge } from './SeverityBadge'

interface AlertBarProps {
  location: Coordinates | null
  subscriberId: string
}

/**
 * The embeddable surface. Renders nothing at all until an alert arrives, so it
 * can be dropped into a host page permanently without occupying space.
 */
export function AlertBar({ location, subscriberId }: AlertBarProps) {
  const { alerts, acknowledged, acknowledge } = useAlertStream(location, subscriberId)
  const visible = alerts.filter((alert) => !acknowledged.has(alert.id)).slice(0, 3)

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2 p-2">
      {visible.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          className={`flex items-start gap-3 rounded-lg border bg-ops-panel p-3 shadow-lg ${
            alert.severity === 'P0' ? 'border-sev-p0' : 'border-ops-border'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <h3 className="truncate text-sm font-semibold">{alert.title}</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ops-muted">{alert.message}</p>
          </div>

          <button
            type="button"
            onClick={() => acknowledge(alert.id)}
            className="shrink-0 rounded border border-ops-accent/40 bg-ops-accent/10 px-2.5 py-1 text-[11px] font-semibold text-ops-accent transition hover:bg-ops-accent/20"
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  )
}
