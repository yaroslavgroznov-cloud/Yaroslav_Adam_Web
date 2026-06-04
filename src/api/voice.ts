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

// F.65: после завершения WebRTC voice-сессии — сливаем собранные turns
// в ту же conversation (kind='voice'), чтобы Адам в чате помнил голос.
// turns: [{role: 'user'|'assistant', content: string}, ...] в хронологии.
// Бэкенд игнорирует пустой массив, бьёт по auth (фронт уже шлёт credentials).
export interface VoiceTurn {
  role: 'user' | 'assistant'
  content: string
  // 2026-06-04: timestamp того момента, когда событие пришло на data channel.
  // Backend сортирует по нему перед сохранением — Whisper транскрипт юзера
  // может прийти позже Adam'ового done и в turnsRef порядок становится
  // обратным. ms epoch.
  ts?: number
}

export interface VoiceTranscriptResult {
  saved: number
  ok: boolean
  conversation_id?: string
  skipped_reason?: string
}

export async function voiceTranscriptFlush(
  turns: VoiceTurn[],
  opts: { cabinet_session_id?: number } = {},
): Promise<VoiceTranscriptResult> {
  if (!turns.length) return { saved: 0, ok: true }
  const res = await fetch(`${BASE}/voice/transcript`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      turns,
      cabinet_session_id: opts.cabinet_session_id,
    }),
  })
  return jsonOrError<VoiceTranscriptResult>(res)
}
