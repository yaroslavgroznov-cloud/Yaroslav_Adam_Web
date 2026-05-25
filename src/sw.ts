// Service Worker — Sprint F.8 PWA push, 2026-05-25.
// injectManifest mode: workbox precaching + custom push handlers.
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision?: string | null }>
}

// Workbox precache assets injected at build time
precacheAndRoute(self.__WB_MANIFEST)

// Берём контроль над страницей сразу при активации (autoUpdate флоу).
self.skipWaiting()
clientsClaim()

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {}
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload
    } catch {
      payload = { body: event.data.text() }
    }
  }
  const title = payload.title ?? 'Адам'
  const body = payload.body ?? 'Тебя зовут.'
  const url = payload.url ?? '/'
  const tag = payload.tag ?? 'adam-call'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag,
      data: { url },
      vibrate: [180, 90, 180],
      requireInteraction: false,
    } as NotificationOptions),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const data = (event.notification.data as { url?: string }) || {}
  const targetUrl = data.url ?? '/'

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    for (const client of allClients) {
      if (client.url.startsWith(self.location.origin)) {
        await client.focus()
        try { await client.navigate(targetUrl) } catch { /* same-origin nav restrictions */ }
        return
      }
    }
    await self.clients.openWindow(targetUrl)
  })())
})
