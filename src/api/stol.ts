// API клиент для /stol/* — F.56 Общий семейный стол, 2026-05-29.
// Раньше /family/chat (F.10). URL изменился в этом релизе; старый /family/chat
// остаётся как deprecated alias на бэкенде (см. main.py).
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface StolConversation {
  id: number
  title: string
  room: string
  seats?: number  // F.56: до 12 мест
}

export interface StolAttachment {
  id: number
  mime_type: string
  original_name: string
  public_url: string | null
  is_image: boolean
}

export interface StolMessage {
  id: number
  by_email: string
  by_name: string
  content: string
  created_at: string
  is_adam: boolean
  // 2026-06-16: было singular `attachment`, стало массив (до 5).
  attachments: StolAttachment[]
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

export async function stolList(): Promise<StolConversation[]> {
  const res = await fetch(`${BASE}/stol`, { credentials: 'include' })
  return jsonOrError<StolConversation[]>(res)
}

export async function stolMessages(
  cid: number, opts: { limit?: number; afterId?: number } = {},
): Promise<StolMessage[]> {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.afterId != null) params.set('after_id', String(opts.afterId))
  const url = `${BASE}/stol/${cid}/messages${params.toString() ? '?' + params : ''}`
  const res = await fetch(url, { credentials: 'include' })
  return jsonOrError<StolMessage[]>(res)
}

export async function stolPostMessage(
  cid: number, content: string, attachmentIds?: number[] | null,
): Promise<StolMessage[]> {
  const body: Record<string, unknown> = { content }
  if (attachmentIds && attachmentIds.length > 0) body.attachment_ids = attachmentIds
  const res = await fetch(`${BASE}/stol/${cid}/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrError<StolMessage[]>(res)
}
