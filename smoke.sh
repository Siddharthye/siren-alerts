#!/usr/bin/env bash
# SIREN smoke test — exercises every endpoint against a running instance.
# Doubles as copy-paste integration documentation for buyers.
#
#   npm run dev          # in one terminal
#   bash smoke.sh        # in another
set -u

BASE="${SIREN_URL:-http://localhost:4101}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    PASS=$((PASS + 1)); echo "  PASS  $name"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL  $name — expected to find: $expected"; echo "        got: ${actual:0:200}"
  fi
}

echo "SIREN smoke @ $BASE"
echo "───────────────────────────────────────────"

# 1. Liveness
check "health" '"status":"ok"' "$(curl -s "$BASE/api/health")"

# 2. Subscribers seeded on first read
check "subscribers seeded" '"sub-library"' "$(curl -s "$BASE/api/subscribers")"

# 3. Register / move a subscriber
check "subscriber upsert" '"smoke-test-device"' "$(curl -s -X POST "$BASE/api/subscribers" \
  -H 'Content-Type: application/json' \
  -d '{"id":"smoke-test-device","label":"Smoke Test","location":{"lat":20.3536,"lng":85.8195}}')"

# 4. Geofenced broadcast — 300m around campus centre
ALERT_RESPONSE="$(curl -s -X POST "$BASE/api/alerts" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Smoke test broadcast",
    "message": "This is the smoke-test alert. Acknowledge to complete the loop.",
    "severity": "P2",
    "geofence": { "lat": 20.3536, "lng": 85.8195, "radiusM": 300 },
    "escalation": [{ "afterSec": 60, "toChannels": ["sms"] }]
  }')"
check "alert created + geofence targeting" '"targeted"' "$ALERT_RESPONSE"

ALERT_ID="$(printf '%s' "$ALERT_RESPONSE" | sed -n 's/.*"alertId":"\([^"]*\)".*/\1/p')"

# 5. Duplicate collapses instead of re-notifying
check "dedupe" '"deduplicated":true' "$(curl -s -X POST "$BASE/api/alerts" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Smoke test broadcast",
    "message": "This is the smoke-test alert. Acknowledge to complete the loop.",
    "severity": "P2",
    "geofence": { "lat": 20.3536, "lng": 85.8195, "radiusM": 300 }
  }')"

# 6. Acknowledge
check "acknowledge" '"acknowledgedBy":1' "$(curl -s -X POST "$BASE/api/ack" \
  -H 'Content-Type: application/json' \
  -d "{\"alertId\":\"$ALERT_ID\",\"subscriberId\":\"smoke-test-device\"}")"

# 7. Listing + stats
check "active alerts listing" "$ALERT_ID" "$(curl -s "$BASE/api/alerts?active=true")"
check "stats" '"acknowledgementRate"' "$(curl -s "$BASE/api/stats")"

# 8. Live stream delivers events (3s listen window)
check "SSE stream" 'retry:' "$(curl -s -N --max-time 3 "$BASE/api/events" || true)"

# 9. Validation rejects garbage
check "validation" '"error"' "$(curl -s -X POST "$BASE/api/alerts" \
  -H 'Content-Type: application/json' -d '{"title":""}')"

echo "───────────────────────────────────────────"
echo "$PASS passed · $FAIL failed"
[[ $FAIL -eq 0 ]]
