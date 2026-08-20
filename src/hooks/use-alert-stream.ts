'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Alert, Coordinates } from '@/domain/types'

export type StreamStatus = 'connecting' | 'live' | 'offline'

interface AlertStream {
  alerts: Alert[]
  status: StreamStatus
  /** Alert ids acknowledged from this browser, so the UI can hide the button. */
  acknowledged: Set<string>
  acknowledge: (alertId: string) => Promise<void>
}

/**
 * Subscribes to SIREN's live alert stream for one listener position.
 *
 * `EventSource` reconnects by itself and replays `Last-Event-ID`, so a rotated
 * connection is invisible here — that is the whole reason the server closes
 * streams on a timer rather than holding them open indefinitely.
 *
 * @example
 * const { alerts, status } = useAlertStream({ lat: 20.3536, lng: 85.8195 }, 'sub-library')
 */
export function useAlertStream(location: Coordinates | null, subscriberId: string): AlertStream {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [status, setStatus] = useState<StreamStatus>('connecting')
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())

  useEffect(() => {
    const query = location ? `?lat=${location.lat}&lng=${location.lng}` : ''
    const source = new EventSource(`/api/events${query}`)

    source.onopen = () => setStatus('live')
    source.onerror = () => setStatus('offline')

    source.addEventListener('alert.created', (event) => {
      const alert = JSON.parse((event as MessageEvent<string>).data) as Alert
      setStatus('live')
      setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, 25))
    })

    source.addEventListener('alert.escalated', (event) => {
      const { alertId, channels } = JSON.parse((event as MessageEvent<string>).data) as {
        alertId: string
        channels: Alert['channels']
      }
      setAlerts((current) =>
        current.map((alert) => (alert.id === alertId ? { ...alert, channels } : alert)),
      )
    })

    return () => source.close()
  }, [location?.lat, location?.lng])

  const acknowledge = useCallback(
    async (alertId: string) => {
      setAcknowledged((current) => new Set(current).add(alertId))

      await fetch('/api/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, subscriberId }),
      })
    },
    [subscriberId],
  )

  return { alerts, status, acknowledged, acknowledge }
}
