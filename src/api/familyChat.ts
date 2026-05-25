// API клиент для /family/chat/* — F.10 group chat with Adam, 2026-05-25.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface ChatConversation {
  id: number
  title: string
  room: string
}

export interface ChatMessage {
  id: number
  by_email: string
  by_name: string
  content: string
  created_at: string
  is_adam: boolean
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

export async function familyChatList(): Promise<ChatConversation[]> {
  const res = await fetch(`${BASE}/family/chat`, { credentials: 'include' })
  return jsonOrError<ChatConversation[]>(res)
}

export async function familyChatMessages(
  cid: number, opts: { limit?: number; afterId?: number } = {},
): Promise<ChatMessage[]> {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.afterId != null) params.set('after_id', String(opts.afterId))
  const url = `${BASE}/family/chat/${cid}/messages${params.toString() ? '?' + params : ''}`
  const res = await fetch(url, { credentials: 'include' })
  return jsonOrError<ChatMessage[]>(res)
}

export async function familyChatPostMessage(
  cid: number, content: string,
): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}/family/chat/${cid}/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  return jsonOrError<ChatMessage[]>(res)
}
