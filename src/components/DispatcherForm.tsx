'use client'

import { useState } from 'react'
import type { Coordinates, Severity } from '@/domain/types'

interface DispatcherFormProps {
  campusCentre: Coordinates
}

const SEVERITIES: Severity[] = ['P0', 'P1', 'P2', 'P3']

const PRESET = {
  title: 'Fire alarm — Block C',
  message: 'Evacuate immediately via the east stairwell. Do not use the lifts.',
}

/**
 * The control-room side of the demo: composes a geofenced broadcast and reports
 * exactly how many subscribers fell inside the radius.
 */
export function DispatcherForm({ campusCentre }: DispatcherFormProps) {
  const [title, setTitle] = useState(PRESET.title)
  const [message, setMessage] = useState(PRESET.message)
  const [severity, setSeverity] = useState<Severity>('P0')
  const [radiusM, setRadiusM] = useState(300)
  const [escalate, setEscalate] = useState(true)
  const [result, setResult] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const broadcast = async () => {
    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          severity,
          geofence: { ...campusCentre, radiusM },
          channels: ['inapp'],
          escalation: escalate ? [{ afterSec: 20, toChannels: ['sms'], note: 'Unacknowledged' }] : [],
        }),
      })

      const body = await response.json()

      if (!response.ok) {
        setResult(body.error ?? 'Broadcast failed')
        return
      }

      setResult(
        body.deduplicated
          ? `Collapsed into an identical alert sent moments ago — ${body.targeted} targeted`
          : `Broadcast delivered to ${body.targeted} subscriber${body.targeted === 1 ? '' : 's'} inside ${radiusM}m`,
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="rounded-lg border border-ops-border bg-ops-panel p-4">
      <h2 className="text-xs font-bold tracking-wide">CONTROL ROOM · Compose broadcast</h2>

      <div className="mt-3 space-y-2.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Alert title"
          className="w-full rounded border border-ops-border bg-ops-bg px-2.5 py-1.5 text-xs outline-none focus:border-ops-accent"
        />

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
          placeholder="Instructions to broadcast"
          className="w-full resize-none rounded border border-ops-border bg-ops-bg px-2.5 py-1.5 text-xs outline-none focus:border-ops-accent"
        />

        <div className="flex gap-2">
          {SEVERITIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSeverity(option)}
              className={`flex-1 rounded border py-1.5 text-[11px] font-bold transition ${
                severity === option
                  ? 'border-ops-accent bg-ops-accent/15 text-ops-accent'
                  : 'border-ops-border text-ops-muted hover:border-ops-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="flex justify-between text-[11px] text-ops-muted">
            <span>Geofence radius</span>
            <span className="font-mono text-ops-text">{radiusM}m</span>
          </span>
          <input
            type="range"
            min={50}
            max={1500}
            step={50}
            value={radiusM}
            onChange={(event) => setRadiusM(Number(event.target.value))}
            className="mt-1 w-full accent-sky-400"
          />
        </label>

        <label className="flex items-center gap-2 text-[11px] text-ops-muted">
          <input
            type="checkbox"
            checked={escalate}
            onChange={(event) => setEscalate(event.target.checked)}
            className="accent-sky-400"
          />
          Escalate to SMS after 20s if unacknowledged
        </label>

        <button
          type="button"
          onClick={broadcast}
          disabled={isSending || title.trim() === '' || message.trim() === ''}
          className="w-full rounded bg-sev-p0 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-red-500 disabled:opacity-40"
        >
          {isSending ? 'BROADCASTING…' : 'BROADCAST NOW'}
        </button>

        {result && <p className="text-[11px] text-emerald-400">{result}</p>}
      </div>
    </section>
  )
}
