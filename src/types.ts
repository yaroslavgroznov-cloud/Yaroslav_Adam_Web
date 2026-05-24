// Adam Mobile Interface — типы. Sprint D unification, 2026-05-24.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AdamChatResponse {
  reply: string
  mode: 'echo' | 'live'
  server_time: string
  sprint: string
  note: string | null
}
