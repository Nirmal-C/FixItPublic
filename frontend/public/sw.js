// FixIt Public — Service Worker
// Handles: app shell caching for offline, push notifications, notification clicks.

const CACHE_NAME = 'fixitpublic-v1'

// App shell assets to cache on install — keeps the UI working offline.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch — network-first, cache fallback ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only intercept same-origin GET requests. Pass through API calls and
  // cross-origin requests (fonts, maps, etc.) without caching.
  const { request } = event
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return
  if (request.url.includes('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache a clone of valid responses so we can serve them offline.
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ─── Push ────────────────────────────────────────────────────────────────────
// Receives push messages from the backend (Sprint 3 FastAPI MCP server).
// Payload format: { title, body, ticketId, crew, tag }
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'FixIt Public', body: event.data.text() }
  }

  const options = {
    body: data.body || 'You have a new update on your report.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'fixitpublic-update',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      ticketId: data.ticketId || null,
      url: data.ticketId ? `/track/${data.ticketId}` : '/track',
    },
    actions: [
      { action: 'track', title: 'Track Report' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FixIt Public', options)
  )
})

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/track'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab at the target URL if one exists.
      const existing = clients.find((c) => c.url.includes(targetUrl))
      if (existing) return existing.focus()
      // Otherwise open a new tab.
      return self.clients.openWindow(targetUrl)
    })
  )
})
