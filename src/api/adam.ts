// API клиент для /adam/* (DRUG backend через CF Tunnel).
// Sprint D unification, 2026-05-24.
import type { ChatMessage, AdamChatResponse } from '../types'

const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface ActiveConversationResponse {
  conversation_id: string
  messages: ChatMessage[]
}

export async function adamGetActive(): Promise<ActiveConversationResponse> {
  const res = await fetch(`${BASE}/adam/active`, {
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

export async function adamChatRequest(content: string): Promise<AdamChatResponse> {
  const res = await fetch(`${BASE}/adam/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
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

export async function adamHealthRequest(): Promise<{ status: string; sprint: string }> {
  const res = await fetch(`${BASE}/adam/health`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
