// API клиент для /family/chat/* — F.10 group chat with Adam, 2026-05-25.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface ChatConversation {
  id: number
  title: string
  room: string
}

export interface ChatAttachment {
  id: number
  mime_type: string
  original_name: string
  public_url: string | null
  is_image: boolean
}

export interface ChatMessage {
  id: number
  by_email: string
  by_name: string
  content: string
  created_at: string
  is_adam: boolean
  attachment?: ChatAttachment | null
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
  cid: number, content: string, attachmentId?: number | null,
): Promise<ChatMessage[]> {
  const body: Record<string, unknown> = { content }
  if (attachmentId != null) body.attachment_id = attachmentId
  const res = await fetch(`${BASE}/family/chat/${cid}/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrError<ChatMessage[]>(res)
}
