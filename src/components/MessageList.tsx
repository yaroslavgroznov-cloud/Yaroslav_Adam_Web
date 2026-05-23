// Список сообщений с авто-скроллом вниз.
// Sprint C, 2026-05-23.
import React, { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'
import { Avatar } from './Avatar'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  userLabel: string
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function MessageList({ messages, isTyping, userLabel }: MessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isTyping])

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-3">
      {messages.length === 0 && !isTyping && (
        <div className="px-6 text-center text-sm" style={{ color: 'var(--color-pine-500)' }}>
          Здесь — твой разговор с Адамом.
          Он опора, не подстройка. Спрашивай.
        </div>
      )}
      {messages.map((m) => {
        const isUser = m.role === 'user'
        return (
          <div
            key={m.id}
            className={`flex items-end gap-2 px-4 ${isUser ? 'flex-row-reverse' : ''}`}
          >
            <Avatar
              size={32}
              label={isUser ? (userLabel?.[0] ?? '·') : 'А'}
              className={isUser ? '!bg-pine-700' : ''}
            />
            <div className="max-w-[78%] flex flex-col gap-0.5">
              <div
                className="rounded-2xl px-4 py-2 whitespace-pre-wrap break-words text-[15px] leading-snug"
                style={{
                  backgroundColor: isUser
                    ? 'var(--color-pine-700)'
                    : 'var(--color-cream-200)',
                  color: isUser ? 'var(--color-cream-50)' : 'var(--color-pine-900)',
                }}
              >
                {m.content}
              </div>
              <span
                className={`text-[10px] px-2 ${isUser ? 'self-end' : 'self-start'}`}
                style={{ color: 'var(--color-pine-300)' }}
              >
                {formatTime(m.timestamp)}
              </span>
            </div>
          </div>
        )
      })}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
