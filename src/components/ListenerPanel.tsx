'use client'

import type { Coordinates } from '@/domain/types'
import { useAlertStream } from '@/hooks/use-alert-stream'
import { AlertCard } from './AlertCard'

interface ListenerPanelProps {
  title: string
  subtitle: string
  subscriberId: string
  location: Coordinates
}

const STATUS_LABEL = {
  connecting: { text: 'connecting', className: 'text-ops-muted' },
  live: { text: 'live', className: 'text-emerald-400' },
  offline: { text: 'reconnecting', className: 'text-sev-p1' },
} as const

/**
 * One simulated campus device listening at a fixed position. The console runs
 * two of these — one inside the broadcast radius and one outside — so the
 * effect of geofencing is visible in a single glance.
 */
export function ListenerPanel({ title, subtitle, subscriberId, location }: ListenerPanelProps) {
  const { alerts, status, acknowledged, acknowledge } = useAlertStream(location, subscriberId)
  const indicator = STATUS_LABEL[status]

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-ops-border bg-ops-bg/60 p-3">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold tracking-wide">{title}</h2>
          <p className="text-[10px] text-ops-muted">{subtitle}</p>
        </div>
        <span className={`flex items-center gap-1 text-[10px] ${indicator.className}`}>
          <span
            className={`inline-block size-1.5 rounded-full bg-current ${
              status === 'live' ? 'siren-pulse' : ''
            }`}
          />
          {indicator.text}
        </span>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-ops-muted">
            No alerts received at this location.
          </p>
        ) : (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isAcknowledged={acknowledged.has(alert.id)}
              onAcknowledge={acknowledge}
            />
          ))
        )}
      </div>
    </section>
  )
}
