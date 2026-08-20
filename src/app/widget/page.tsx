import { AlertBar } from '@/components/AlertBar'

interface WidgetPageProps {
  searchParams: Promise<{ lat?: string; lng?: string; subscriberId?: string }>
}

const parseCoordinate = (value: string | undefined): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * `/widget?lat=&lng=&subscriberId=` — the iframe-embeddable alert surface.
 *
 * This is what makes SIREN stack-agnostic: a host application on Flask, Vue, or
 * plain HTML embeds one iframe and receives geofenced alerts without running any
 * of our code in their bundle.
 *
 * @example
 * <iframe src="http://localhost:4101/widget?lat=20.3536&lng=85.8195"
 *         style="border:0;width:100%;height:220px"></iframe>
 */
export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const { lat, lng, subscriberId } = await searchParams

  const parsedLat = parseCoordinate(lat)
  const parsedLng = parseCoordinate(lng)
  const location = parsedLat !== null && parsedLng !== null ? { lat: parsedLat, lng: parsedLng } : null

  return (
    <div className="bg-transparent">
      <AlertBar location={location} subscriberId={subscriberId ?? 'widget-guest'} />
    </div>
  )
}
