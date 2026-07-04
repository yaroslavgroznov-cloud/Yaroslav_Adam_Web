// Adam Mobile Interface — типы. Sprint D unification, 2026-05-24.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  // L0 самообучения (2026-07-04): id ассистентского сообщения (для 👍/👎)
  // и локальное состояние оценки.
  id?: string
  feedback?: 1 | -1 | null
}

export interface AdamChatResponse {
  reply: string
  mode: 'echo' | 'live'
  server_time: string
  sprint: string
  note: string | null
  message_id?: string | null
}
