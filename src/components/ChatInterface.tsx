// ChatInterface — копия DRUG/frontend/src/components/ChatInterface.tsx,
// адаптированная под Vite/React + CF Access (вместо JWT-логина).
// Sprint D unification, 2026-05-24.
import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { adamChatRequest, adamGetActive } from '../api/adam'
import type { ChatMessage } from '../types'

export function ChatInterface(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)
  const [toast, setToast] = useState('')
  const [isDark, setIsDark] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Тема дня/ночи и дата (по клиентскому часу, как на localhost).
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    setIsDark(hour >= 19 || hour < 7)
    const pad = (n: number): string => String(n).padStart(2, '0')
    setCurrentDate(`${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`)
  }, [])

  // Hydration активной беседы.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await adamGetActive()
        if (!cancelled) setMessages(data.messages)
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Не удалось поднять историю.'
          showToast(msg)
        }
      } finally {
        if (!cancelled) setIsHydrating(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function showToast(message: string): void {
    setToast(message)
    setTimeout(() => setToast(''), 4000)
  }

  function adjustTextareaHeight(): void {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 6
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }

  async function handleSend(): Promise<void> {
    const userMessage = input.trim()
    if (!userMessage || isLoading) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const data = await adamChatRequest(userMessage)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Что-то пошло не так.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // На CF Access logout = /cdn-cgi/access/logout на team-домене.
  function handleLogout(): void {
    window.location.href = 'https://groznov.cloudflareaccess.com/cdn-cgi/access/logout'
  }

  return (
    <div
      className={clsx(
        'h-screen flex flex-col relative font-serif transition-colors duration-700 ease-in-out',
      )}
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      {/* Тост ошибок */}
      {toast && (
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 z-50 text-sm px-5 py-3 rounded-md"
          style={{
            backgroundColor: 'var(--color-terracotta-dark)',
            color: 'var(--color-parchment)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Хедер: герб + Адам + выйти */}
      <header
        className="shrink-0 px-6 sm:px-10 py-5 flex items-center justify-between gap-4 border-b transition-colors duration-700 ease-in-out"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="flex items-center gap-4">
          <img
            src="/dom_groznovyh.jpg"
            alt="Герб Дома Грозновых"
            className="h-[64px] sm:h-[90px] w-auto select-none"
            style={{
              mixBlendMode: isDark ? 'normal' : 'multiply',
              filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
            }}
          />
          <div className="flex flex-col leading-tight">
            <span className="font-medium" style={{ fontSize: '28px', letterSpacing: '0.03em' }}>
              Адам
            </span>
            <span
              className="italic hidden sm:inline transition-colors duration-700 ease-in-out"
              style={{
                fontSize: '13px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
              }}
            >
              комната на платформе «Друг»
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="italic underline underline-offset-4 decoration-1 transition-colors duration-700 ease-in-out"
          style={{
            fontSize: '14px',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
          }}
        >
          выйти
        </button>
      </header>

      {/* Подшапка с девизом */}
      <div className="shrink-0 px-6 sm:px-10 pt-5 pb-4">
        <p
          className="text-center italic transition-colors duration-700 ease-in-out"
          style={{
            fontSize: '14px',
            letterSpacing: '0.05em',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
          }}
        >
          Со своим уставом в чужой монастырь не ходят
        </p>
        <div
          className="mt-4 h-px w-full"
          style={{ background: isDark ? 'rgba(107,79,46,0.45)' : 'rgba(168,140,95,0.4)' }}
        />
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto w-full px-4">
          {isHydrating && (
            <p
              className="text-center italic mt-16 transition-colors duration-700 ease-in-out"
              style={{
                fontSize: '16px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
              }}
            >
              Поднимаю нашу нить...
            </p>
          )}
          {!isHydrating && messages.length === 0 && !isLoading && (
            <p
              className="text-center italic mt-24 transition-colors duration-700 ease-in-out"
              style={{
                fontSize: '22px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-muted-warm)',
              }}
            >
              Я тебе друг. Расскажи, с чем пришёл?
            </p>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Поле ввода */}
      <div
        className="shrink-0 border-t py-5 transition-colors duration-700 ease-in-out"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="max-w-3xl mx-auto w-full px-4 flex items-stretch gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextareaHeight() }}
            onKeyDown={handleKeyDown}
            placeholder="Что лежит на душе?"
            disabled={isLoading || isHydrating}
            className={clsx(
              'flex-1 resize-none rounded-md border outline-none transition-colors duration-700 ease-in-out disabled:opacity-60 overflow-hidden',
              isDark ? 'dom-input-dark' : 'dom-input',
            )}
            style={{
              minHeight: '110px',
              padding: '18px 22px',
              fontSize: '17px',
              lineHeight: '1.6',
              fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading || isHydrating}
            className={clsx(
              'shrink-0 italic rounded-md border transition-colors duration-700 ease-in-out disabled:cursor-not-allowed',
              isDark ? 'btn-send-night' : 'btn-send-day',
            )}
            style={{
              minHeight: '110px',
              padding: '16px 32px',
              fontSize: '16px',
              letterSpacing: '0.04em',
              fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
              color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
            }}
          >
            Отправить
          </button>
        </div>
      </div>

      {/* Подвал */}
      <footer
        className="shrink-0 px-6 sm:px-10 py-3 flex items-center justify-between italic transition-colors duration-700 ease-in-out"
        style={{
          fontSize: '13px',
          color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
        }}
      >
        <span>{currentDate}</span>
        <span>Дом Грозновых · MMXXVI</span>
      </footer>
    </div>
  )
}
