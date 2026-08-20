'use client'

/**
 * SirenAlerts — the copy-paste React embed for buyers.
 *
 * Self-contained on purpose: no imports from the rest of this repo, so you can
 * copy this single file into any React 18+ app and it works. For non-React
 * stacks, use the iframe widget (`/widget`) or `siren-client.js` instead.
 *
 * @example
 * <SirenAlerts baseUrl="http://localhost:4101" lat={20.3536} lng={85.8195} />
 */

import { useEffect, useState } from 'react'

interface EmbeddedAlert {
  id: string
  title: string
  message: string
  severity: 'P0' | 'P1' | 'P2' | 'P3'
}

interface SirenAlertsProps {
  /** Where the SIREN service is running. */
  baseUrl: string
  /** Listener position — only alerts whose geofence contains it arrive. */
  lat?: number
  lng?: number
  /** Identifies acknowledgements from this surface. */
  subscriberId?: string
  /** Cap on simultaneously visible alerts. */
  maxVisible?: number
}

const SEVERITY_COLOR: Record<EmbeddedAlert['severity'], string> = {
  P0: '#ef4444',
  P1: '#f97316',
  P2: '#eab308',
  P3: '#38bdf8',
}

export function SirenAlerts({
  baseUrl,
  lat,
  lng,
  subscriberId = 'react-embed',
  maxVisible = 3,
}: SirenAlertsProps) {
  const [alerts, setAlerts] = useState<EmbeddedAlert[]>([])

  useEffect(() => {
    const base = baseUrl.replace(/\/$/, '')
    const query = lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : ''
    const source = new EventSource(`${base}/api/events${query}`)

    source.addEventListener('alert.created', (event) => {
      const alert = JSON.parse((event as MessageEvent<string>).data) as EmbeddedAlert
      setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)])
    })

    return () => source.close()
  }, [baseUrl, lat, lng])

  const acknowledge = (alertId: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== alertId))
    void fetch(`${baseUrl.replace(/\/$/, '')}/api/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, subscriberId }),
    })
  }

  if (alerts.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 8, fontFamily: 'system-ui, sans-serif' }}>
      {alerts.slice(0, maxVisible).map((alert) => (
        <div
          key={alert.id}
          role="alert"
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${SEVERITY_COLOR[alert.severity]}55`,
            background: '#121826',
            color: '#e5e7eb',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: SEVERITY_COLOR[alert.severity],
              border: `1px solid ${SEVERITY_COLOR[alert.severity]}66`,
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            {alert.severity}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{alert.title}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8b95a7', lineHeight: 1.5 }}>
              {alert.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => acknowledge(alert.id)}
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              color: '#38bdf8',
              background: '#38bdf81a',
              border: '1px solid #38bdf866',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  )
}
