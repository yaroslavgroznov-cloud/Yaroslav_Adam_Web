// API клиент для /adam/* (DRUG backend через CF Pages Function proxy).
// Sprint E Single OTP fix, 2026-05-24.
// Sprint F.2 10 культурных комнат, 2026-05-25.
//
// На production VITE_ADAM_API_BASE пустой → relative URL `/adam/...` →
// browser идёт на adam.groznov.uk/adam/... → Pages Function проксирует
// на adam-api.groznov.uk (с inject X-Adam-User-Email + X-Adam-Proxy-Secret).
//
// Same-origin — один OTP на adam.groznov.uk покрывает всё, iOS Safari работает.
import type { ChatMessage, AdamChatResponse, MessageAttachment } from '../types'

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

// Сырой ответ backend: rating (+1/-1/null) — прошлая оценка юзера. Мапим
// на локальное поле feedback, чтобы кнопки 👍/👎 подсветились после гидрации
// (возобновляемая разметка от зачатия — L0 самообучения, 2026-07-04).
interface RawActiveMessage {
  role: 'user' | 'assistant'
  content: string
  id?: string
  rating?: 1 | -1 | null
  // 13.09.2026: вложения этого сообщения (связь 0067). Бэкенд всегда шлёт
  // массив; пустой — «к этому сообщению файлов не привязано».
  attachments?: MessageAttachment[]
}

/** Краткая карточка беседы для панели «История чатов». */
export interface ConversationBrief {
  id: string
  room: string
  started_at: string
  last_message_at: string
  message_count: number
  /** Первая реплика пользователя — заголовок карточки. */
  preview: string
  /** Текущая ли это беседа (в неё пишем). */
  is_active: boolean
  /** Есть ли сводка — значит хвост уже в долгой памяти. */
  has_summary: boolean
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
  const raw = (await res.json()) as { conversation_id: string; messages: RawActiveMessage[] }
  return {
    conversation_id: raw.conversation_id,
    messages: raw.messages.map((m) => ({
      role: m.role,
      content: m.content,
      id: m.id,
      feedback: m.rating ?? null,
      ...(m.attachments && m.attachments.length > 0 ? { attachments: m.attachments } : {}),
    })),
  }
}

export async function adamChatRequest(
  content: string, room?: string, attachmentIds?: number[] | null,
): Promise<AdamChatResponse> {
  const body: Record<string, unknown> = { content }
  if (room) body.room = room
  if (attachmentIds && attachmentIds.length > 0) body.attachment_ids = attachmentIds
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
  // L0: message_id ассистентского сообщения приходит в событии 'done'.
  onDone: (messageId?: string) => void
  onError: (detail: string) => void
}

// L0 самообучения: 👍/👎 на ответ Адама. rating: 1 = 👍, -1 = 👎.
export async function adamFeedback(
  messageId: string, rating: 1 | -1, reason?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/adam/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId, rating, reason: reason ?? null }),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const j = await res.json(); if (j && typeof j.detail === 'string') detail = j.detail } catch { /* */ }
    throw new Error(detail)
  }
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
  attachmentIds?: number[] | null,
): () => void {
  const maxRetries = opts.retries ?? 2
  const backoffMs = opts.retryBackoffMs ?? 1000
  const controller = new AbortController()
  const body: Record<string, unknown> = { content }
  if (room) body.room = room
  if (attachmentIds && attachmentIds.length > 0) body.attachment_ids = attachmentIds

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
          let evt: { type?: string; text?: string; detail?: string; message_id?: string | null }
          try {
            evt = JSON.parse(json)
          } catch {
            continue
          }
          if (evt.type === 'delta' && typeof evt.text === 'string') {
            firstDeltaSeen = true
            cb.onDelta(evt.text)
          } else if (evt.type === 'done') {
            cb.onDone(evt.message_id ?? undefined)
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


/** Закрыть текущую беседу и открыть новую (слово Творца 13.09.2026).
 *
 *  Сказанное не пропадает: сообщения остаются в базе и в семантической памяти,
 *  а хвост беседы уходит в сводку — «долгую память» Адама. Закрытая беседа
 *  видна в «Истории чатов».
 */
export async function adamCloseConversation(room?: string): Promise<{ closed_id: string | null }> {
  const res = await fetch(`${BASE}/adam/conversations/close`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room ? { room } : {}),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = j.detail
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return (await res.json()) as { closed_id: string | null }
}

/** Список бесед пользователя — свежие сверху. */
export async function adamListConversations(): Promise<ConversationBrief[]> {
  const res = await fetch(`${BASE}/adam/conversations`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as { conversations: ConversationBrief[] }
  return j.conversations
}

/** Сообщения одной беседы — для просмотра из «Истории чатов». */
export async function adamGetConversation(id: string): Promise<ActiveConversationResponse> {
  const res = await fetch(`${BASE}/adam/conversations/${encodeURIComponent(id)}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as { conversation_id: string; messages: RawActiveMessage[] }
  return {
    conversation_id: raw.conversation_id,
    messages: raw.messages.map((m) => ({
      role: m.role,
      content: m.content,
      id: m.id,
      feedback: m.rating ?? null,
      ...(m.attachments && m.attachments.length > 0 ? { attachments: m.attachments } : {}),
    })),
  }
}


/** Плотность окна диалога — из чего сложен ход Адама прямо сейчас. */
export interface ContextBudgetPart { key: string; label: string; tokens: number }
export interface ContextBudget {
  total: number
  limit: number
  percent: number
  parts: ContextBudgetPart[]
  model: string
  counted_by: string
  messages_after_summary: number
  messages_in_summary: number
}

export async function adamContextBudget(room?: string): Promise<ContextBudget> {
  const url = room
    ? `${BASE}/adam/context/budget?room=${encodeURIComponent(room)}`
    : `${BASE}/adam/context/budget`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as ContextBudget
}
