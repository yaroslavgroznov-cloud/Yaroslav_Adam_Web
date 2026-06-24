// API клиент для creator-only функций: F.94 биография, F.67 proactive
// контроль, F.69 Google OAuth. Ring 6 (2026-06-24): backend готов, UI
// раньше не было — Творец дёргал endpoints напрямую через curl/CF Access.
//
// Same-origin: adam.groznov.uk/me/* и /auth/google/* идут через
// Pages Function proxy на adam-api.groznov.uk.

const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

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

// ==========================================================================
// F.94 — экспорт автобиографии (GDPR art. 20)
// ==========================================================================

export type BiographyFormat = 'json' | 'md' | 'pdf' | 'docx'

/** Возвращает URL для скачивания биографии. Браузер сам инициирует загрузку. */
export function biographyDownloadUrl(format: BiographyFormat, since?: string): string {
  const params = new URLSearchParams()
  if (since) params.set('since', since)
  const qs = params.toString()
  return `${BASE}/me/biography.${format}${qs ? `?${qs}` : ''}`
}

// ==========================================================================
// F.67 — proactive writer (Творец рулит) — 2026-06-22
// ==========================================================================

export interface ProactiveState {
  user_email: string
  enabled: boolean
  last_outbound_at: string | null
  last_trigger_kind: string | null
  suppression_until: string | null
  total_sent_24h: number
  quiet_hours_start: number
  quiet_hours_end: number
  timezone: string
  updated_at: string | null
}

export async function proactiveGetState(): Promise<ProactiveState> {
  const res = await fetch(`${BASE}/me/proactive`, { credentials: 'include' })
  return jsonOrError<ProactiveState>(res)
}

export async function proactiveEnable(): Promise<ProactiveState> {
  const res = await fetch(`${BASE}/me/proactive/enable`, {
    method: 'POST', credentials: 'include',
  })
  return jsonOrError<ProactiveState>(res)
}

export async function proactiveDisable(): Promise<ProactiveState> {
  const res = await fetch(`${BASE}/me/proactive/disable`, {
    method: 'POST', credentials: 'include',
  })
  return jsonOrError<ProactiveState>(res)
}

export async function proactiveSuppress(hours: number): Promise<ProactiveState> {
  const url = `${BASE}/me/proactive/suppress?hours=${encodeURIComponent(String(hours))}`
  const res = await fetch(url, { method: 'POST', credentials: 'include' })
  return jsonOrError<ProactiveState>(res)
}

export async function proactiveSetQuiet(
  startHour: number, endHour: number, tz: string,
): Promise<ProactiveState> {
  const url = `${BASE}/me/proactive/quiet?start=${startHour}&end=${endHour}&tz=${encodeURIComponent(tz)}`
  const res = await fetch(url, { method: 'POST', credentials: 'include' })
  return jsonOrError<ProactiveState>(res)
}

// ==========================================================================
// F.69 — Google OAuth (Gmail send + Calendar readonly) — 2026-06-23
// ==========================================================================

export interface GoogleOAuthStartResponse {
  consent_url: string
  state: string
}

export interface GoogleOAuthStatus {
  connected: boolean
  oauth_enabled: boolean
  provider?: string
  scopes?: string[]
  granted_at?: string
  expires_at?: string | null
  has_refresh_token?: boolean
}

export async function googleOAuthStart(
  scopesKey: 'gmail+calendar' | 'gmail' | 'calendar' = 'gmail+calendar',
): Promise<GoogleOAuthStartResponse> {
  const url = `${BASE}/auth/google/start?scopes_key=${encodeURIComponent(scopesKey)}`
  const res = await fetch(url, { method: 'POST', credentials: 'include' })
  return jsonOrError<GoogleOAuthStartResponse>(res)
}

export async function googleOAuthStatus(): Promise<GoogleOAuthStatus> {
  const res = await fetch(`${BASE}/auth/google/status`, { credentials: 'include' })
  return jsonOrError<GoogleOAuthStatus>(res)
}

export async function googleOAuthRevoke(): Promise<{ revoked: boolean }> {
  const res = await fetch(`${BASE}/auth/google/revoke`, {
    method: 'POST', credentials: 'include',
  })
  return jsonOrError<{ revoked: boolean }>(res)
}
