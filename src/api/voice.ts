// API клиент для /voice/* — F.15, 2026-05-26.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface RealtimeSession {
  id?: string
  model?: string
  voice?: string
  expires_at?: number
  client_secret: {
    value: string
    expires_at?: number
  }
  [k: string]: unknown
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

export async function voiceSessionCreate(
  opts: { voice?: string; model?: string; cabinet_session_id?: number } = {},
): Promise<RealtimeSession> {
  const res = await fetch(`${BASE}/voice/session`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
  return jsonOrError<RealtimeSession>(res)
}
