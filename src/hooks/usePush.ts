// usePush — управление Web Push subscription. F.8, 2026-05-25.
import { useCallback, useEffect, useState } from 'react'

import { pushGetVapidPublic, pushSubscribe, pushUnsubscribe } from '../api/push'

type Status =
  | 'unsupported'        // браузер не умеет Push API
  | 'needs-pwa-ios'      // iOS Safari, не установлен в Home Screen
  | 'backend-disabled'   // VAPID_PRIVATE_KEY не настроен на бэке
  | 'denied'             // permission = denied
  | 'unsubscribed'       // готовы подписаться
  | 'subscribed'         // подписаны

export interface PushState {
  status: Status
  busy: boolean
  error: string
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return buffer
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
}

export function usePush(): PushState {
  const [status, setStatus] = useState<Status>('unsubscribed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [vapid, setVapid] = useState<string | null>(null)

  const recompute = useCallback(async (): Promise<void> => {
    // 1. Платформенная поддержка
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)
        || !('PushManager' in window) || !('Notification' in window)) {
      // iOS Safari < 16.4 не имеет Push API в обычном Safari
      if (isIOS() && !isStandalone()) {
        setStatus('needs-pwa-ios')
      } else {
        setStatus('unsupported')
      }
      return
    }
    // iOS 16.4+ требует standalone PWA
    if (isIOS() && !isStandalone()) {
      setStatus('needs-pwa-ios')
      return
    }
    // 2. Backend VAPID enabled?
    try {
      const v = await pushGetVapidPublic()
      if (!v.enabled || !v.public_key) {
        setStatus('backend-disabled')
        return
      }
      setVapid(v.public_key)
    } catch {
      setStatus('backend-disabled')
      return
    }
    // 3. Permission state
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    // 4. Уже подписаны?
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      setStatus(existing ? 'subscribed' : 'unsubscribed')
    } catch {
      setStatus('unsubscribed')
    }
  }, [])

  useEffect(() => {
    void recompute()
  }, [recompute])

  const subscribe = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      if (!vapid) {
        const v = await pushGetVapidPublic()
        if (!v.enabled || !v.public_key) throw new Error('Push не настроен на сервере.')
        setVapid(v.public_key)
      }
      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'unsubscribed')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const key = urlBase64ToUint8Array(vapid ?? (await pushGetVapidPublic()).public_key!)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      })
      const json = sub.toJSON()
      const endpoint = sub.endpoint
      const p256dh = json.keys?.p256dh ?? ''
      const auth = json.keys?.auth ?? ''
      await pushSubscribe(endpoint, p256dh, auth, navigator.userAgent.slice(0, 500))
      setStatus('subscribed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подписать')
    } finally {
      setBusy(false)
    }
  }, [vapid])

  const unsubscribe = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await pushUnsubscribe(sub.endpoint).catch(() => { /* ok если уже не было */ })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отписать')
    } finally {
      setBusy(false)
    }
  }, [])

  return { status, busy, error, subscribe, unsubscribe }
}
