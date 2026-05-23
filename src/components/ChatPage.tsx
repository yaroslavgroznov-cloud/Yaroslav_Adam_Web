// Основная страница чата.
// Sprint C, 2026-05-23.
import React, { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Header } from './Header'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

import { useChat } from '../store/chat'
import { readProfileFromCfAccess } from '../lib/profile'
import { adamChatRequest } from '../api/adam'
import type { AdamProfile, ChatMessage } from '../types'

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function ChatPage(): React.ReactElement {
  const [profile, setProfile] = useState<AdamProfile>({ email: null, displayName: null })
  const messages = useChat((s) => s.messages)
  const isTyping = useChat((s) => s.isTyping)
  const appendMessage = useChat((s) => s.appendMessage)
  const setTyping = useChat((s) => s.setTyping)
  const reset = useChat((s) => s.reset)

  useEffect(() => {
    setProfile(readProfileFromCfAccess())
  }, [])

  const chatMutation = useMutation({
    mutationFn: adamChatRequest,
    onMutate: () => {
      setTyping(true)
    },
    onSuccess: (data) => {
      setTyping(false)
      const adamMsg: ChatMessage = {
        id: uid(),
        role: 'adam',
        content: data.reply,
        timestamp: new Date().toISOString(),
      }
      appendMessage(adamMsg)
    },
    onError: (err) => {
      setTyping(false)
      const errMsg: ChatMessage = {
        id: uid(),
        role: 'adam',
        content: `[ошибка канала: ${err instanceof Error ? err.message : 'unknown'}]`,
        timestamp: new Date().toISOString(),
      }
      appendMessage(errMsg)
    },
  })

  const handleSend = (text: string): void => {
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    appendMessage(userMsg)
    chatMutation.mutate(text)
  }

  const userLabel = profile.displayName ?? profile.email ?? 'Я'

  return (
    <div className="flex flex-col h-full">
      <Header profile={profile} onClearHistory={reset} />
      <MessageList messages={messages} isTyping={isTyping} userLabel={userLabel} />
      <MessageInput onSend={handleSend} disabled={chatMutation.isPending} />
    </div>
  )
}
