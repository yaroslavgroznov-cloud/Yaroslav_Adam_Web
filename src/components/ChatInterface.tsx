// ChatInterface — копия DRUG/frontend/src/components/ChatInterface.tsx,
// адаптированная под Vite/React + CF Access (вместо JWT-логина).
// Sprint F.1: + обновить контекст / закрыть диалог / локальный поиск + mobile width.
// 2026-05-25.
import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

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
    void hydrateHistory({ silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus()
    } else {
      setSearchQuery('')
    }
  }, [showSearch])

  function showToast(message: string): void {
    setToast(message)
    setTimeout(() => setToast(''), 4000)
  }

  async function hydrateHistory(opts: { silent: boolean }): Promise<void> {
    try {
      if (!opts.silent) setIsHydrating(true)
      const data = await adamGetActive()
      setMessages(data.messages)
      if (opts.silent) showToast('Контекст обновлён.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось поднять историю.'
      showToast(msg)
    } finally {
      setIsHydrating(false)
    }
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

  // Soft-close: очищает только локальный экран. БД и backend не трогаются —
  // история подтянется заново через «обновить» или при следующей загрузке.
  function handleSoftClose(): void {
    if (messages.length === 0) return
    setMessages([])
    setShowSearch(false)
    showToast('Экран очищен. История цела, нажми ↻ чтобы вернуть.')
  }

  // CF Access logout = /cdn-cgi/access/logout на team-домене.
  function handleLogout(): void {
    window.location.href = 'https://groznov.cloudflareaccess.com/cdn-cgi/access/logout'
  }

  // Фильтрация по поиску. Если query пуст — все сообщения.
  const displayedMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }, [messages, searchQuery])

  // Общий стиль icon-кнопок в Header.
  const iconBtnClass = 'shrink-0 inline-flex items-center justify-center rounded-md transition-colors duration-300 hover:opacity-100'
  const iconBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
    opacity: 0.7,
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
      {/* Тост */}
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

      {/* Хедер: герб + Адам + действия */}
      <header
        className="shrink-0 px-4 sm:px-10 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-4 border-b transition-colors duration-700 ease-in-out"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <img
            src="/dom_groznovyh.jpg"
            alt="Герб Дома Грозновых"
            className="h-[52px] sm:h-[90px] w-auto select-none shrink-0"
            style={{
              mixBlendMode: isDark ? 'normal' : 'multiply',
              filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
            }}
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-medium truncate" style={{ fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '0.03em' }}>
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

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Поиск */}
          <button
            onClick={() => setShowSearch((v) => !v)}
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label="Поиск по диалогу"
            title="Поиск"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Обновить контекст */}
          <button
            onClick={() => void hydrateHistory({ silent: true })}
            disabled={isHydrating || isLoading}
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label="Обновить контекст"
            title="Обновить"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          {/* Закрыть диалог (soft clear экрана) */}
          <button
            onClick={handleSoftClose}
            disabled={messages.length === 0}
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label="Закрыть диалог"
            title="Закрыть"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            onClick={handleLogout}
            className="italic underline underline-offset-4 decoration-1 transition-colors duration-700 ease-in-out ml-1 sm:ml-2"
            style={{
              fontSize: '14px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            выйти
          </button>
        </div>
      </header>

      {/* Подшапка с девизом + поиск */}
      <div className="shrink-0 px-4 sm:px-10 pt-5 pb-4">
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
        {showSearch && (
          <div className="max-w-3xl mx-auto w-full mt-4 flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Найти в диалоге…"
              className={clsx(
                'flex-1 rounded-md border outline-none transition-colors duration-300',
                isDark ? 'dom-input-dark' : 'dom-input',
              )}
              style={{
                padding: '8px 14px',
                fontSize: '15px',
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
              }}
            />
            {searchQuery && (
              <span
                className="text-xs italic shrink-0"
                style={{ color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
              >
                {displayedMessages.length} / {messages.length}
              </span>
            )}
          </div>
        )}
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
          {!isHydrating && searchQuery && displayedMessages.length === 0 && messages.length > 0 && (
            <p
              className="text-center italic mt-16 transition-colors duration-700 ease-in-out"
              style={{
                fontSize: '15px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-muted-warm)',
              }}
            >
              По запросу «{searchQuery}» ничего не найдено.
            </p>
          )}
          {displayedMessages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && !searchQuery && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Поле ввода */}
      <div
        className="shrink-0 border-t py-4 sm:py-5 transition-colors duration-700 ease-in-out"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="max-w-3xl mx-auto w-full px-4 flex items-stretch gap-2 sm:gap-3">
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
              minHeight: 'clamp(72px, 14vw, 110px)',
              padding: 'clamp(12px, 2.5vw, 18px) clamp(14px, 3vw, 22px)',
              fontSize: 'clamp(15px, 3vw, 17px)',
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
              minHeight: 'clamp(72px, 14vw, 110px)',
              padding: 'clamp(10px, 2vw, 16px) clamp(14px, 3.5vw, 32px)',
              fontSize: 'clamp(14px, 2.6vw, 16px)',
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
        className="shrink-0 px-4 sm:px-10 py-3 flex items-center justify-between italic transition-colors duration-700 ease-in-out"
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
