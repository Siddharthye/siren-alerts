const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Tunables, all overridable from `.env`. Defaults are chosen so that a fresh
 * clone behaves sensibly with no configuration at all.
 */
export const config = {
  /** Identical broadcasts within this window collapse into one. */
  dedupeWindowSec: readNumber(process.env.SIREN_DEDUPE_WINDOW_SEC, 120),

  /** Upper bound on alerts accepted per minute, across all callers. */
  maxAlertsPerMinute: readNumber(process.env.SIREN_MAX_ALERTS_PER_MINUTE, 10),

  /** How long an alert stays active when the caller does not specify `ttlSec`. */
  defaultTtlSec: readNumber(process.env.SIREN_DEFAULT_TTL_SEC, 3600),

  /** Centre of the seeded demo campus (KIIT Campus 25, Bhubaneswar). */
  campusCentre: {
    lat: readNumber(process.env.SIREN_CAMPUS_LAT, 20.3536),
    lng: readNumber(process.env.SIREN_CAMPUS_LNG, 85.8195),
  },
} as const
