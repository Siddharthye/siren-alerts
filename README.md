# SIREN — Geofenced Alert & Broadcast Service

**Drop-in emergency notifications for any stack.** Radius-targeted broadcasts,
acknowledgement tracking, and an automatic escalation ladder — behind a REST +
SSE API, an iframe widget, and a React component. No database. No API keys.
One command to run.

> Built and battle-used by Team PROMPT & PRAY inside
> [AEGIS](https://github.com/Siddharthye/aegis-campus), our campus emergency
> response OS. You are buying the exact module our own product depends on.

---

## 60-second quickstart

```bash
git clone <this-repo> && cd siren-alerts
npm install
npm run dev          # http://localhost:4101 — live console, seeded demo data
```

Broadcast your first geofenced alert:

```bash
curl -X POST http://localhost:4101/api/alerts \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Fire alarm — Block C",
    "message": "Evacuate via the east stairwell.",
    "severity": "P0",
    "geofence": { "lat": 20.3536, "lng": 85.8195, "radiusM": 300 },
    "escalation": [{ "afterSec": 60, "toChannels": ["sms"] }]
  }'
```

The console at `/` shows two live listeners side by side — one inside the
geofence receives it instantly, one 720m away sees nothing. That's the product.

Run the full check: `bash smoke.sh` (9 checks, ~5 seconds).

---

## Three ways to integrate

| Your stack | Use | Time |
| --- | --- | --- |
| Anything with HTTP | REST + SSE API (below) | ~10 min |
| Any web page (Flask, Django, PHP, plain HTML…) | `<iframe src=".../widget?lat=&lng=">` or `<script src=".../siren-client.js">` | ~3 min |
| React | Copy [`src/components/embed/SirenAlerts.tsx`](src/components/embed/SirenAlerts.tsx) — a single self-contained file | ~5 min |

```html
<!-- iframe: geofenced alert surface on any page -->
<iframe src="http://localhost:4101/widget?lat=20.3536&lng=85.8195"
        style="border:0;width:100%;height:220px"></iframe>

<!-- or the framework-free client -->
<script src="http://localhost:4101/siren-client.js"></script>
<script>
  Siren.connect({
    baseUrl: 'http://localhost:4101',
    location: { lat: 20.3536, lng: 85.8195 },
    onAlert: (alert) => console.log('ALERT', alert.title),
  })
</script>
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/alerts` | Raise a broadcast (geofence, channels, escalation ladder, TTL) |
| `GET` | `/api/alerts?active=true` | List alerts, newest first |
| `POST` | `/api/subscribers` | Register/move a listener (keeps geofencing accurate) |
| `GET` | `/api/subscribers` | List listeners |
| `POST` | `/api/ack` | Acknowledge — stops the escalation ladder |
| `GET` | `/api/events?lat=&lng=` | **SSE** live stream, geofence-filtered server-side |
| `GET` | `/api/stats` | Delivery + acknowledgement counters |
| `GET` | `/api/health` | Liveness |

All endpoints are CORS-open and zod-validated; errors always arrive as
`{ "error": string, "details"? }`.

## What you're actually buying

- **Geofencing done right** — haversine on the server, so a listener only ever
  receives alerts whose radius contains them. Campus-wide = omit the geofence.
- **Escalation ladder** — unacknowledged alerts widen to more channels on a
  schedule (`escalation: [{ afterSec, toChannels }]`). Evaluated lazily on
  read, which means it works on serverless where background timers silently die.
- **Dedupe + throttle** — identical broadcasts within a window collapse into
  one; a runaway client can't flood the campus.
- **Ack tracking** — per-subscriber acknowledgement with rates in `/api/stats`.
- **Reconnect-proof SSE** — streams self-rotate under the serverless timeout;
  `EventSource` resumes from `Last-Event-ID` and no event is ever lost.

## Architecture (for your due diligence)

```
src/domain/     pure logic: geofencing, dedupe, throttle, escalation (unit-testable)
src/lib/        orchestration: alert-service, config, seed
src/app/api/    thin HTTP routes (zod validation, consistent errors)
src/store/      StorageAdapter: in-memory + JSON locally, Upstash Redis in prod
public/         widget + framework-free client
```

Storage is behind a four-method interface. Local dev needs nothing; deployed
(e.g. Vercel), set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` and
state survives serverless cold starts. Every tunable lives in
[`.env.example`](.env.example) — all optional.

## License to buyer

Non-exclusive license per HACQUIRE 2026 market rules: you may integrate and
modify this module within your product; reselling the code itself is
prohibited by event rules. We keep our copy — it runs our product.
