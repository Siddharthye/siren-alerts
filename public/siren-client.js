/**
 * SIREN framework-free browser client.
 *
 * For host applications that are not React — plain HTML, Vue, Svelte, Django
 * templates, anything. Drop in one script tag and you have geofenced alerts.
 *
 * @example
 * <script src="http://localhost:4101/siren-client.js"></script>
 * <script>
 *   const siren = Siren.connect({
 *     baseUrl: 'http://localhost:4101',
 *     location: { lat: 20.3536, lng: 85.8195 },
 *     subscriberId: 'student-4471',
 *     onAlert: (alert) => window.alert(alert.title),
 *   })
 *   // siren.acknowledge(alertId)
 *   // siren.disconnect()
 * </script>
 */
(function (global) {
  'use strict'

  function connect(options) {
    if (!options || !options.baseUrl) {
      throw new Error('Siren.connect requires a baseUrl')
    }

    var baseUrl = options.baseUrl.replace(/\/$/, '')
    var subscriberId = options.subscriberId || 'guest-' + Math.random().toString(36).slice(2, 10)
    var location = options.location || null

    var query = location ? '?lat=' + location.lat + '&lng=' + location.lng : ''
    var source = new EventSource(baseUrl + '/api/events' + query)

    source.addEventListener('alert.created', function (event) {
      if (typeof options.onAlert === 'function') {
        options.onAlert(JSON.parse(event.data))
      }
    })

    source.addEventListener('alert.escalated', function (event) {
      if (typeof options.onEscalation === 'function') {
        options.onEscalation(JSON.parse(event.data))
      }
    })

    source.onopen = function () {
      if (typeof options.onStatusChange === 'function') options.onStatusChange('live')
    }

    source.onerror = function () {
      // EventSource reconnects on its own; this is informational only.
      if (typeof options.onStatusChange === 'function') options.onStatusChange('reconnecting')
    }

    /** Reports this subscriber's position so geofenced alerts reach them. */
    function updateLocation(next) {
      location = next
      return fetch(baseUrl + '/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subscriberId, location: next }),
      })
    }

    /** Marks an alert as seen, which stops its escalation ladder. */
    function acknowledge(alertId) {
      return fetch(baseUrl + '/api/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alertId, subscriberId: subscriberId }),
      })
    }

    return {
      subscriberId: subscriberId,
      acknowledge: acknowledge,
      updateLocation: updateLocation,
      disconnect: function () {
        source.close()
      },
    }
  }

  global.Siren = { connect: connect }
})(window)
