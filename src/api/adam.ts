// API клиент для /adam/* (DRUG backend через CF Pages Function proxy).
// Sprint E Single OTP fix, 2026-05-24.
// Sprint F.2 10 культурных комнат, 2026-05-25.
//
// На production VITE_ADAM_API_BASE пустой → relative URL `/adam/...` →
// browser идёт на adam.groznov.uk/adam/... → Pages Function проксирует
// на adam-api.groznov.uk (с inject X-Adam-User-Email + X-Adam-Proxy-Secret).
//
// Same-origin — один OTP на adam.groznov.uk покрывает всё, iOS Safari работает.
import type { ChatMessage, AdamChatResponse } from '../types'

const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface ActiveConversationResponse {
  conversation_id: string
  messages: ChatMessage[]
}

export interface RoomInfo {
  slug: string
  name: string
}

export interface RoomsResponse {
  rooms: RoomInfo[]
  default: string
}

export async function adamGetActive(room?: string): Promise<ActiveConversationResponse> {
  const url = room ? `${BASE}/adam/active?room=${encodeURIComponent(room)}` : `${BASE}/adam/active`
  const res = await fetch(url, {
    credentials: 'include',
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = j.detail
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return (await res.json()) as ActiveConversationResponse
}

export async function adamChatRequest(
  content: string, room?: string, attachmentId?: number | null,
): Promise<AdamChatResponse> {
  const body: Record<string, unknown> = { content }
  if (room) body.room = room
  if (attachmentId != null) body.attachment_id = attachmentId
  const res = await fetch(`${BASE}/adam/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = j.detail
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return (await res.json()) as AdamChatResponse
}

export async function adamGetRooms(): Promise<RoomsResponse> {
  const res = await fetch(`${BASE}/adam/rooms`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as RoomsResponse
}

export interface StreamCallbacks {
  onDelta: (text: string) => void
  onDone: () => void
  onError: (detail: string) => void
}

export interface StreamOptions {
  retries?: number          // макс число ретраев (default 2)
  retryBackoffMs?: number   // base backoff (default 1000) — 1s, 2s, 4s...
}

// SSE-стрим ответа Адама. Парсит "data: {json}\n\n" события.
// Auto-retry (F.5): сетевые ошибки ДО первого delta — ретраим до 2 раз.
// После первого delta — не ретраим (часть текста уже на экране, повтор
// продублирует начало). HTTP 4xx/5xx с readable body — не ретраим
// (семантичная ошибка от backend, нужно показать toast).
// Возвращает abort-функцию.
export function adamChatStream(
  content: string,
  room: string | undefined,
  cb: StreamCallbacks,
  opts: StreamOptions = {},
  attachmentId?: number | null,
): () => void {
  const maxRetries = opts.retries ?? 2
  const backoffMs = opts.retryBackoffMs ?? 1000
  const controller = new AbortController()
  const body: Record<string, unknown> = { content }
  if (room) body.room = room
  if (attachmentId != null) body.attachment_id = attachmentId

  let attempt = 0

  const run = async (): Promise<void> => {
    let firstDeltaSeen = false
    try {
      const res = await fetch(`${BASE}/adam/chat/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        let detail = `HTTP ${res.status}`
        try {
          const j = await res.json()
          if (j && typeof j.detail === 'string') detail = j.detail
        } catch { /* not json */ }
        cb.onError(detail)
        return
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        // Парсим целые SSE-кадры (data: ...\n\n).
        let sep: number
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          if (!frame.startsWith('data: ')) continue
          const json = frame.slice(6)
          let evt: { type?: string; text?: string; detail?: string }
          try {
            evt = JSON.parse(json)
          } catch {
            continue
          }
          if (evt.type === 'delta' && typeof evt.text === 'string') {
            firstDeltaSeen = true
            cb.onDelta(evt.text)
          } else if (evt.type === 'done') {
            cb.onDone()
            return
          } else if (evt.type === 'error') {
            cb.onError(evt.detail ?? 'stream error')
            return
          }
        }
      }
      // Стрим закрылся без done.
      if (firstDeltaSeen) {
        // часть текста на экране — финализируем
        cb.onDone()
        return
      }
      // 0 байт ответа — это аномалия, ретраим как сетевую ошибку
      if (attempt < maxRetries) {
        attempt += 1
        await new Promise((r) => setTimeout(r, backoffMs * attempt))
        return run()
      }
      cb.onError('Пустой ответ от Адама. Попробуй ещё раз.')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      // Сетевая ошибка. Ретраим только если первого delta ещё не было.
      if (!firstDeltaSeen && attempt < maxRetries) {
        attempt += 1
        await new Promise((r) => setTimeout(r, backoffMs * attempt))
        return run()
      }
      cb.onError(err instanceof Error ? err.message : 'stream failure')
    }
  }

  void run()
  return () => controller.abort()
}

export async function adamHealthRequest(): Promise<{ status: string; sprint: string }> {
  const res = await fetch(`${BASE}/adam/health`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
