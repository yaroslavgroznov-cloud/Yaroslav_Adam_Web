// API клиент для /family/push/* — F.8 PWA push, 2026-05-25.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface VapidPublic {
  public_key: string | null
  enabled: boolean
}

async function jsonOrError<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = j.detail
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export async function pushGetVapidPublic(): Promise<VapidPublic> {
  const res = await fetch(`${BASE}/family/push/vapid-public`, { credentials: 'include' })
  return jsonOrError<VapidPublic>(res)
}

export async function pushSubscribe(
  endpoint: string, p256dh: string, auth: string, userAgent: string,
): Promise<void> {
  const res = await fetch(`${BASE}/family/push/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, p256dh, auth, user_agent: userAgent }),
  })
  await jsonOrError(res)
}

export async function pushUnsubscribe(endpoint: string): Promise<void> {
  const res = await fetch(`${BASE}/family/push/unsubscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
  await jsonOrError(res)
}
