// Zustand store для чата.
// Sprint C, 2026-05-23.
import { create } from 'zustand'
import type { ChatMessage } from '../types'
import { loadHistory, saveHistory, clearHistory } from '../lib/history'

interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  appendMessage: (m: ChatMessage) => void
  setTyping: (v: boolean) => void
  reset: () => void
}

export const useChat = create<ChatState>((set, get) => ({
  messages: loadHistory(),
  isTyping: false,
  appendMessage: (m) => {
    const next = [...get().messages, m]
    saveHistory(next)
    set({ messages: next })
  },
  setTyping: (v) => set({ isTyping: v }),
  reset: () => {
    clearHistory()
    set({ messages: [], isTyping: false })
  },
}))
