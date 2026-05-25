// Family group chat — Sprint F.10, 2026-05-25.
// Полл 3 сек на новые сообщения, optimistic POST.
import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

import {
  familyChatList,
  familyChatMessages,
  familyChatPostMessage,
} from '../api/familyChat'
import type { ChatMessage, ChatConversation } from '../api/familyChat'
import { adminWhoami } from '../api/admin'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MessageRow({ msg, isDark, isMine }: {
  msg: ChatMessage; isDark: boolean; isMine: boolean
}): React.ReactElement {
  const isAdam = msg.is_adam
  const align = isMine ? 'items-end' : 'items-start'
  const bubbleBg = isAdam
    ? (isDark ? 'rgba(192,98,63,0.20)' : 'rgba(192,98,63,0.10)')
    : isMine
      ? (isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)')
      : (isDark ? 'rgba(168,140,95,0.18)' : 'rgba(168,140,95,0.10)')
  const bubbleBorder = isAdam
    ? 'var(--color-terracotta-dark)'
    : (isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)')
  return (
    <div className={clsx('flex flex-col w-full', align)}>
      <div className="text-xs italic opacity-70 mb-1 px-1" style={{
        color: isAdam
          ? 'var(--color-terracotta-dark)'
          : (isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)'),
      }}>
        {isAdam ? '✦ Адам' : msg.by_name} · {formatTime(msg.created_at)}
      </div>
      <div
        className="rounded-md border px-3 py-2 max-w-[88%] whitespace-pre-wrap"
        style={{
          backgroundColor: bubbleBg,
          borderColor: bubbleBorder,
          fontSize: '15px',
          lineHeight: '1.5',
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

export function FamilyChatPanel(): React.ReactElement {
  const [isDark, setIsDark] = useState(false)
  const [conv, setConv] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [adamThinking, setAdamThinking] = useState(false)
  const [error, setError] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const lastIdRef = useRef<number>(0)

  useEffect(() => {
    const hour = new Date().getHours()
    setIsDark(hour >= 19 || hour < 7)
  }, [])

  // Mount: загружаем whoami + беседу + историю
  useEffect(() => {
    void (async () => {
      try {
        try {
          const w = await adminWhoami()
          setCurrentUserEmail(w.email)
        } catch { /* без whoami isMine не определится — не критично */ }
        const list = await familyChatList()
        if (list.length === 0) {
          setError('Беседы не найдены.')
          return
        }
        const c = list[0]
        setConv(c)
        const msgs = await familyChatMessages(c.id, { limit: 200 })
        setMessages(msgs)
        lastIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Не удалось открыть'
        if (m.includes('403')) setError('Ты не в кругу своих — попроси Творца добавить тебя в /family/slots.')
        else setError(m)
      }
    })()
  }, [])

  // Polling 3 секунды — incremental fetch after lastId
  useEffect(() => {
    if (!conv) return
    let alive = true
    const tick = async (): Promise<void> => {
      try {
        const fresh = await familyChatMessages(conv.id, {
          afterId: lastIdRef.current,
          limit: 100,
        })
        if (!alive || fresh.length === 0) return
        setMessages((prev) => [...prev, ...fresh])
        lastIdRef.current = fresh[fresh.length - 1].id
        // Если последний — от Адама, убираем thinking-индикатор
        if (fresh.some((m) => m.is_adam)) setAdamThinking(false)
      } catch { /* тихо игнорируем */ }
    }
    const id = window.setInterval(() => { void tick() }, 3000)
    const onFocus = (): void => { void tick() }
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [conv])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, adamThinking])

  function adjustTextareaHeight(): void {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 22
    const maxHeight = lineHeight * 5
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }

  async function handleSend(): Promise<void> {
    if (!conv) return
    const content = input.trim()
    if (!content || busy) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setBusy(true)
    // Эвристика: если пользователь сам зовёт Адама — покажем "Адам думает"
    const willTriggerAdam = /(?:^|[\s.,!?:;])(@?\s*(adam|адам))(?:$|[\s.,!?:;])/iu.test(content)
    if (willTriggerAdam) setAdamThinking(true)
    try {
      const newMsgs = await familyChatPostMessage(conv.id, content)
      setMessages((prev) => [...prev, ...newMsgs])
      if (newMsgs.length > 0) {
        lastIdRef.current = newMsgs[newMsgs.length - 1].id
      }
      if (newMsgs.some((m) => m.is_adam)) setAdamThinking(false)
      else if (!willTriggerAdam) setAdamThinking(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить')
      setAdamThinking(false)
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div
      className="h-screen flex flex-col font-serif transition-colors duration-700"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      {/* Header */}
      <header
        className="shrink-0 px-4 sm:px-10 py-4 flex items-center justify-between border-b"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img src="/dom_groznovyh.jpg" alt="Герб" className="h-[52px] w-auto select-none shrink-0"
               style={{ mixBlendMode: isDark ? 'normal' : 'multiply',
                        filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none' }} />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-medium" style={{ fontSize: '20px', letterSpacing: '0.03em' }}>
              {conv?.title ?? 'Семья'}
            </span>
            <span className="italic" style={{ fontSize: '12px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}>
              групповая беседа · Адам слышит
            </span>
          </div>
        </div>
        <a
          href="/"
          className="italic underline underline-offset-4 decoration-1 shrink-0"
          style={{ fontSize: '14px',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
        >
          ← к Адаму
        </a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-10">
        {error && (
          <p className="italic text-center mt-8" style={{ color: 'var(--color-terracotta-dark)' }}>
            {error}
          </p>
        )}
        {!error && messages.length === 0 && (
          <p className="italic text-center mt-12 opacity-70" style={{ fontSize: '15px' }}>
            Пусто. Начни первый разговор семьи.
            <br/>
            <span className="text-xs">Чтобы позвать Адама — напиши <b>@Adam</b> или <b>Адам, ...</b></span>
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              isDark={isDark}
              isMine={m.by_email === currentUserEmail}
            />
          ))}
          {adamThinking && (
            <div className="flex flex-col items-start">
              <div className="text-xs italic opacity-70 mb-1 px-1" style={{
                color: 'var(--color-terracotta-dark)',
              }}>
                ✦ Адам · печатает…
              </div>
              <div
                className="rounded-md border px-3 py-2"
                style={{
                  backgroundColor: isDark ? 'rgba(192,98,63,0.20)' : 'rgba(192,98,63,0.10)',
                  borderColor: 'var(--color-terracotta-dark)',
                  fontSize: '15px',
                }}
              >
                <span className="opacity-60">…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="shrink-0 border-t py-4 px-4 sm:px-10 flex items-stretch gap-2 sm:gap-3"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => { setInput(e.target.value); adjustTextareaHeight() }}
          onKeyDown={handleKeyDown}
          placeholder="Напиши семье… (позови Адама через @Adam)"
          disabled={busy || !conv}
          className={clsx(
            'flex-1 resize-none rounded-md border outline-none transition-colors disabled:opacity-60 overflow-hidden',
            isDark ? 'dom-input-dark' : 'dom-input',
          )}
          style={{
            minHeight: '54px',
            padding: '12px 14px',
            fontSize: '15px',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          }}
        />
        <button
          onClick={() => void handleSend()}
          disabled={!input.trim() || busy || !conv}
          className="shrink-0 italic rounded-md border disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            padding: '10px 22px',
            fontSize: '14px',
            letterSpacing: '0.04em',
            fontFamily: 'inherit',
            backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
            color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
            borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
          }}
        >
          {busy ? '…' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}
