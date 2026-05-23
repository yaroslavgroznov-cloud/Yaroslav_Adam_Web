// API клиент для /adam/* endpoint'ов backend Штаба.
// В dev — VITE_ADAM_API_BASE (.env.local) указывает на localhost:8003 или dev-туннель.
// В prod — пусто, потому что фронт на adam.groznov.uk и backend через CF Tunnel на том же origin.
//
// Sprint C, 2026-05-23.
import type { AdamChatResponse } from '../types'

const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export async function adamChatRequest(content: string): Promise<AdamChatResponse> {
  const res = await fetch(`${BASE}/adam/chat`, {
    method: 'POST',
    credentials: 'include',  // важно — Cloudflare CF_Authorization кука должна уйти
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = j.detail
    } catch {
      /* not json */
    }
    throw new Error(detail)
  }
  return (await res.json()) as AdamChatResponse
}

export async function adamHealthRequest(): Promise<{ status: string; sprint: string }> {
  const res = await fetch(`${BASE}/adam/health`, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
