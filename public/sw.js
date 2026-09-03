const CACHE_NAME = 'fcg-cache-v2'

const STATIC_ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/fcg-logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(STATIC_ASSETS)
      )
  )

  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key !== CACHE_NAME
          )
          .map((key) =>
            caches.delete(key)
          )
      )
    )
  )

  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()

        caches
          .open(CACHE_NAME)
          .then((cache) => {
            cache.put(
              event.request,
              copy
            )
          })

        return response
      })
      .catch(() =>
        caches.match(event.request)
      )
  )
})

self.addEventListener('push', (event) => {
  let data = {}

  try {
    data = event.data
      ? event.data.json()
      : {}
  } catch {
    data = {
      title: 'FC Glostruplona',
      body:
        event.data?.text() ||
        'Ny opdatering fra FC Glostruplona',
    }
  }

  const title =
    data.title ||
    'FC Glostruplona'

  const options = {
    body:
      data.body ||
      'Ny opdatering fra FC Glostruplona',

    icon: '/icon-192.png',

    badge: '/icon-192.png',

    data: {
      url: data.url || '/',
    },

    tag:
      data.tag ||
      'fcg-notification',

    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  )
})

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close()

    const targetUrl =
      event.notification.data?.url ||
      '/'

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if (
              'focus' in client &&
              client.url.includes(
                self.location.origin
              )
            ) {
              if ('navigate' in client) {
                client.navigate(
                  targetUrl
                )
              }

              return client.focus()
            }
          }

          if (
            self.clients.openWindow
          ) {
            return self.clients.openWindow(
              targetUrl
            )
          }
        })
    )
  }
)