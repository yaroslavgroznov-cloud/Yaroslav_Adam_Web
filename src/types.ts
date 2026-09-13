// Adam Mobile Interface — типы. Sprint D unification, 2026-05-24.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  // L0 самообучения (2026-07-04): id ассистентского сообщения (для 👍/👎)
  // и локальное состояние оценки.
  id?: string
  feedback?: 1 | -1 | null
  // 13.09.2026, слово Творца: прикреплённые файлы НЕ должны пропадать из
  // диалога после отправки — их должно быть видно глазами у самого сообщения.
  // До этой правки `pendingFiles` очищался в handleSend, а в сообщение не
  // клался вовсе: файл уходил Адаму, но со стороны выглядел исчезнувшим.
  attachments?: MessageAttachment[]
}

/** Вложение в том виде, в каком его показывает пузырь сообщения.
 *  Подмножество FileMeta — ровно то, что нужно для отрисовки и ссылки. */
export interface MessageAttachment {
  id: number
  original_name: string
  mime_type: string
  size_bytes: number
  is_image: boolean
  public_url: string | null
}

export interface AdamChatResponse {
  reply: string
  mode: 'echo' | 'live'
  server_time: string
  sprint: string
  note: string | null
  message_id?: string | null
}
