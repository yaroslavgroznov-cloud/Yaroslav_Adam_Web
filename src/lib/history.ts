// История чата в localStorage. Sync через GET /adam/history — стаб
// до B-добавка endpoint (будет в backend Sprint B+).
//
// Sprint C, 2026-05-23.
import type { ChatMessage } from '../types'

const KEY = 'adam-chat-history-v1'
const MAX_MESSAGES = 200  // обрезаем при превышении, чтобы не разносить localStorage

export function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is ChatMessage =>
        m && typeof m.id === 'string' && (m.role === 'user' || m.role === 'adam') &&
        typeof m.content === 'string' && typeof m.timestamp === 'string',
    )
  } catch {
    return []
  }
}

export function saveHistory(messages: ChatMessage[]): void {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES)
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    /* quota / privacy mode — игнорируем */
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
