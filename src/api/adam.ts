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

export async function adamChatRequest(content: string, room?: string): Promise<AdamChatResponse> {
  const body: Record<string, string> = { content }
  if (room) body.room = room
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

export async function adamHealthRequest(): Promise<{ status: string; sprint: string }> {
  const res = await fetch(`${BASE}/adam/health`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
