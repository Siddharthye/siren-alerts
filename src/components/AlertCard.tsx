'use client'

import type { Alert } from '@/domain/types'
import { SeverityBadge } from './SeverityBadge'

interface AlertCardProps {
  alert: Alert
  isAcknowledged: boolean
  onAcknowledge: (alertId: string) => void
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function AlertCard({ alert, isAcknowledged, onAcknowledge }: AlertCardProps) {
  const hasEscalated = alert.firedEscalationSteps.length > 0

  return (
    <article
      className={`rounded-lg border bg-ops-panel p-3 ${
        alert.severity === 'P0' ? 'border-sev-p0/50' : 'border-ops-border'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{alert.title}</h3>
        <SeverityBadge severity={alert.severity} />
      </header>

      <p className="mt-1.5 text-xs leading-relaxed text-ops-muted">{alert.message}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-ops-muted">
        <span className="font-mono">{formatTime(alert.createdAt)}</span>
        <span aria-hidden>·</span>
        <span>{alert.channels.join(', ')}</span>
        {hasEscalated && (
          <span className="rounded bg-sev-p1/15 px-1.5 py-0.5 font-semibold text-sev-p1">
            ESCALATED
          </span>
        )}
      </div>

      {isAcknowledged ? (
        <p className="mt-2.5 text-[11px] font-semibold text-emerald-400">✓ Acknowledged</p>
      ) : (
        <button
          type="button"
          onClick={() => onAcknowledge(alert.id)}
          className="mt-2.5 w-full rounded border border-ops-accent/40 bg-ops-accent/10 py-1.5 text-[11px] font-semibold text-ops-accent transition hover:bg-ops-accent/20"
        >
          Acknowledge
        </button>
      )}
    </article>
  )
}
