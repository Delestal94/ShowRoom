export type AnalyticsEventType =
  | 'page_view'
  | 'unit_view'
  | 'tour_view'
  | 'unit_filter'
  | 'unit_compare'
  | 'contact_form_open'
  | 'contact_form_submit'
  | 'dwell_time'

export interface AnalyticsEvent {
  type: AnalyticsEventType
  projectSlug: string
  unitId?: string
  tourId?: string
  metadata?: Record<string, any>
}

// Client-side event queue
const eventQueue: AnalyticsEvent[] = []
const SESSION_ID = typeof window !== 'undefined' ? getOrCreateSessionId() : null

function getOrCreateSessionId(): string {
  const key = 'showroom_session_id'
  let sessionId = localStorage.getItem(key)

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(key, sessionId)
  }

  return sessionId
}

export async function trackEvent(event: AnalyticsEvent) {
  if (!SESSION_ID) return

  eventQueue.push(event)

  // Batch send events every 30 seconds or when queue reaches 10 events
  if (eventQueue.length >= 10) {
    await flushEvents()
  }
}

export async function flushEvents() {
  if (eventQueue.length === 0) return

  const events = eventQueue.splice(0)

  try {
    await fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        events,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.error('Failed to flush analytics events:', error)
    // Re-queue events on failure
    eventQueue.push(...events)
  }
}

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(
      '/api/analytics/collect',
      JSON.stringify({
        sessionId: SESSION_ID,
        events: eventQueue,
        timestamp: new Date().toISOString(),
      })
    )
  })

  // Periodic flush every 30 seconds
  setInterval(() => {
    flushEvents()
  }, 30000)
}
