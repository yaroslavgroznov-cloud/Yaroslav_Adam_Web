// Adam Mobile Interface — типы.
// Sprint C, 2026-05-23.

export interface ChatMessage {
  id: string
  role: 'user' | 'adam'
  content: string
  timestamp: string  // ISO
}

export interface AdamProfile {
  email: string | null
  displayName: string | null
}

export interface AdamChatResponse {
  reply: string
  mode: 'echo' | 'live'
  server_time: string
  sprint: string
  note: string | null
}
