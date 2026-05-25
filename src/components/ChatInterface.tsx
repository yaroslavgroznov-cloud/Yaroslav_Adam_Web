// ChatInterface — копия DRUG/frontend/src/components/ChatInterface.tsx,
// адаптированная под Vite/React + CF Access (вместо JWT-логина).
// Sprint F.1: + обновить контекст / закрыть диалог / локальный поиск + mobile width.
// Sprint F.2: + dropdown 10 культурных комнат, per-(user, room) conversation.
// 2026-05-25.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { CallFamilyModal } from './CallFamilyModal'
import { FamilyInbox } from './FamilyInbox'
import { HeaderOverflowMenu } from './HeaderOverflowMenu'
import type { OverflowItem } from './HeaderOverflowMenu'
import { IosInstallHint } from './IosInstallHint'
import { adamChatStream, adamGetActive, adamGetRooms } from '../api/adam'
import type { RoomInfo } from '../api/adam'
import { adminGetState, adminWhoami } from '../api/admin'
import type { SystemState, Whoami } from '../api/admin'
import { familyCallSeen, familyCallsReceived } from '../api/family'
import type { FamilyCall } from '../api/family'
import { usePush } from '../hooks/usePush'
import type { ChatMessage } from '../types'

const ROOM_STORAGE_KEY = 'adam.currentRoom'
const DEFAULT_ROOM_FALLBACK = 'vostochnoslavyanskaya'

// Hardcoded fallback — точная копия core_loader.ROOMS_ORDER.
// Гарантирует, что dropdown всегда виден, даже если /adam/rooms упал
// (плохая сеть, кэш Service Worker, временный 5xx). После загрузки
// rooms из API список перезаписывается актуальным.
const ROOMS_FALLBACK: RoomInfo[] = [
  { slug: 'vostochnoslavyanskaya', name: 'Восточнославянская' },
  { slug: 'anglo_saxonskaya', name: 'Англосаксонская' },
  { slug: 'romanskaya', name: 'Романская' },
  { slug: 'germanskaya', name: 'Германская' },
  { slug: 'vostochnoaziatskaya', name: 'Восточноазиатская' },
  { slug: 'indoariyskaya', name: 'Индоарийская' },
  { slug: 'semitskaya', name: 'Семитская' },
  { slug: 'tyurkskaya', name: 'Тюркская' },
  { slug: 'yugovostochnoaziatskaya', name: 'Юго-восточноазиатская' },
  { slug: 'ellinskaya', name: 'Эллинская' },
]

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
  const [rooms, setRooms] = useState<RoomInfo[]>(ROOMS_FALLBACK)
  const [currentRoom, setCurrentRoom] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_ROOM_FALLBACK
    return window.localStorage.getItem(ROOM_STORAGE_KEY) ?? DEFAULT_ROOM_FALLBACK
  })
  const [pullDistance, setPullDistance] = useState(0)
  const [ptrReady, setPtrReady] = useState(false)
  const [whoami, setWhoami] = useState<Whoami | null>(null)
  const [frozenState, setFrozenState] = useState<SystemState | null>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [unseenCalls, setUnseenCalls] = useState<FamilyCall[]>([])
  const push = usePush()
  // P2: ref на abort-функцию текущего стрима, чтобы Cancel мог его прервать
  const streamAbortRef = useRef<(() => void) | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const ptrStartYRef = useRef<number | null>(null)
  const ptrActiveRef = useRef(false)

  const PTR_TRIGGER_PX = 70   // > этого — релиз обновляет
  const PTR_MAX_PX = 120      // макс растяжение индикатора

  // Тема дня/ночи и дата (по клиентскому часу, как на localhost).
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    setIsDark(hour >= 19 || hour < 7)
    const pad = (n: number): string => String(n).padStart(2, '0')
    setCurrentDate(`${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`)
  }, [])

  // Загрузка списка комнат + whoami + system state (один раз при mount).
  useEffect(() => {
    void (async () => {
      try {
        const data = await adamGetRooms()
        setRooms(data.rooms)
        if (!data.rooms.some((r) => r.slug === currentRoom)) {
          setCurrentRoom(data.default)
        }
      } catch {
        // тихо игнорируем — fallback на default
      }
    })()
    void (async () => {
      try {
        const w = await adminWhoami()
        setWhoami(w)
      } catch { /* пользователь не залогинен через CF Access — маловероятно */ }
    })()
    void (async () => {
      try {
        const s = await adminGetState()
        setFrozenState(s)
      } catch { /* state недоступен — продолжаем как обычно */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling входящих звонков каждые 30 секунд (F.7).
  useEffect(() => {
    const fetchUnseen = async (): Promise<void> => {
      try {
        const calls = await familyCallsReceived({ onlyUnseen: true, limit: 5 })
        setUnseenCalls(calls)
      } catch {
        // тихо — не блокируем UI
      }
    }
    void fetchUnseen()
    const id = window.setInterval(() => { void fetchUnseen() }, 30_000)
    // Также пинг на focus (юзер вернулся на вкладку — обновим сразу)
    const onFocus = (): void => { void fetchUnseen() }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  async function handleMarkCallSeen(callId: number): Promise<void> {
    setUnseenCalls((prev) => prev.filter((c) => c.id !== callId))
    try {
      await familyCallSeen(callId)
    } catch {
      // тихий fail — следующий polling всё равно подтянет правду
    }
  }

  // Hydration активной беседы — при старте и при смене комнаты.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROOM_STORAGE_KEY, currentRoom)
    }
    void hydrateHistory({ silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom])

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
      const data = await adamGetActive(currentRoom)
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

    // Резервируем пустой assistant-bubble, который будет расти по дельтам.
    // Первый токен → isLoading=false (TypingIndicator уходит, появляется текст).
    let firstDeltaSeen = false
    let assistantStarted = false

    await new Promise<void>((resolve) => {
      const abort = adamChatStream(userMessage, currentRoom, {
        onDelta: (text) => {
          if (!firstDeltaSeen) {
            firstDeltaSeen = true
            setIsLoading(false)
          }
          setMessages((prev) => {
            if (!assistantStarted) {
              assistantStarted = true
              return [...prev, { role: 'assistant', content: text }]
            }
            const next = prev.slice()
            const last = next[next.length - 1]
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { role: 'assistant', content: last.content + text }
            }
            return next
          })
        },
        onDone: () => {
          setIsLoading(false)
          streamAbortRef.current = null
          resolve()
        },
        onError: (detail) => {
          setIsLoading(false)
          streamAbortRef.current = null
          showToast(detail || 'Что-то пошло не так.')
          // Если ничего не успело прийти — убираем пустой assistant bubble.
          if (!assistantStarted) {
            // ничего не добавляли — ничего не убираем
          }
          resolve()
        },
      })
      streamAbortRef.current = abort
    })
  }

  // P2: прервать текущий стрим Адама (пока он "печатает") + добавить
  // короткое замечание в assistant-bubble.
  function handleCancelStream(): void {
    const abort = streamAbortRef.current
    if (!abort) return
    abort()
    streamAbortRef.current = null
    setIsLoading(false)
    setMessages((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      if (last.role !== 'assistant') return prev
      const next = prev.slice()
      next[next.length - 1] = {
        role: 'assistant',
        content: (last.content || '') + ' …(прервано тобой)',
      }
      return next
    })
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

  // Pull-to-refresh — только touch (мобильник). На ПК scroll-bar.
  // iOS bounce оставляем нативным, наш handler поверх него.
  function handlePtrTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    const el = messagesScrollRef.current
    if (!el || el.scrollTop > 0 || isHydrating || isLoading) {
      ptrStartYRef.current = null
      ptrActiveRef.current = false
      return
    }
    ptrStartYRef.current = e.touches[0].clientY
    ptrActiveRef.current = true
  }

  function handlePtrTouchMove(e: React.TouchEvent<HTMLDivElement>): void {
    if (!ptrActiveRef.current || ptrStartYRef.current === null) return
    const dy = e.touches[0].clientY - ptrStartYRef.current
    if (dy <= 0) {
      setPullDistance(0)
      setPtrReady(false)
      return
    }
    const dist = Math.min(dy, PTR_MAX_PX)
    setPullDistance(dist)
    setPtrReady(dist > PTR_TRIGGER_PX)
  }

  function handlePtrTouchEnd(): void {
    if (!ptrActiveRef.current) return
    const fire = ptrReady
    ptrActiveRef.current = false
    ptrStartYRef.current = null
    setPullDistance(0)
    setPtrReady(false)
    if (fire) void hydrateHistory({ silent: true })
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
          {/* Главные 4 кнопки видны всегда: семейный чат, позвать, поиск, обновить */}

          {/* Семейный чат (F.10) */}
          <a
            href="/family/chat"
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label="Семейный чат"
            title="Семейный чат"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </a>

          {/* Позвать своего */}
          <button
            onClick={() => setShowCallModal(true)}
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label="Позвать своего"
            title="Позвать своего"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>

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

          {/* Overflow ••• — всё остальное (close/push/metrics/kill-switch/logout) */}
          <HeaderOverflowMenu
            isDark={isDark}
            items={(() => {
              const items: OverflowItem[] = []
              // Закрыть диалог
              items.push({
                key: 'close',
                label: 'Закрыть диалог',
                onClick: handleSoftClose,
                disabled: messages.length === 0,
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ),
              })
              // Push (если supported)
              if (push.status === 'unsubscribed' || push.status === 'subscribed'
                  || push.status === 'denied' || push.status === 'needs-pwa-ios') {
                const pushLabel = push.status === 'subscribed'
                  ? 'Уведомления включены'
                  : push.status === 'denied' ? 'Уведомления заблокированы'
                  : push.status === 'needs-pwa-ios' ? 'Установи как приложение'
                  : 'Включить уведомления'
                items.push({
                  key: 'push',
                  label: pushLabel,
                  onClick: () => {
                    if (push.status === 'subscribed') void push.unsubscribe()
                    else if (push.status === 'denied')
                      showToast('Уведомления заблокированы. Включи в настройках браузера.')
                    else if (push.status === 'needs-pwa-ios')
                      showToast('На iPhone: «Поделиться» → «На экран Домой», открой как приложение.')
                    else void push.subscribe()
                  },
                  disabled: push.busy,
                  badge: push.status === 'subscribed' ? 'active' : null,
                  icon: push.status === 'subscribed' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  ),
                })
              }
              // Parents-only
              if (whoami?.role === 'parent') {
                items.push({
                  key: 'metrics',
                  label: 'Пульс платформы',
                  href: '/admin/metrics',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 17 9 11 13 15 21 7" />
                      <polyline points="14 7 21 7 21 14" />
                    </svg>
                  ),
                })
                items.push({
                  key: 'kill-switch',
                  label: frozenState?.is_frozen ? 'Адам заморожен — управлять' : 'Kill-switch',
                  href: '/kill-switch',
                  badge: frozenState?.is_frozen ? 'frozen' : null,
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ),
                })
                items.push({
                  key: 'slots',
                  label: 'Свои (управление)',
                  href: '/family/slots',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                })
              }
              // Logout
              items.push({
                key: 'logout',
                label: 'Выйти',
                onClick: handleLogout,
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                ),
              })
              return items
            })()}
          />
        </div>
      </header>

      {/* iOS install hint (P6) — мягкий баннер, один раз */}
      <IosInstallHint isDark={isDark} />

      {/* Family Inbox — баннер входящих звонков (F.7) */}
      <FamilyInbox isDark={isDark} calls={unseenCalls} onSeen={(id) => void handleMarkCallSeen(id)} />

      {/* Модалка «Позвать своего» */}
      {showCallModal && (
        <CallFamilyModal
          isDark={isDark}
          onClose={() => setShowCallModal(false)}
          onCalled={(name, delivered) => {
            showToast(
              delivered
                ? `${name} получит и письмо, и плашку в чате.`
                : `${name} получит плашку, как только зайдёт.`,
            )
          }}
        />
      )}

      {/* Подшапка с девизом + dropdown комнат + поиск */}
      <div className="shrink-0 px-4 sm:px-10 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p
            className="italic transition-colors duration-700 ease-in-out text-center sm:text-left"
            style={{
              fontSize: '14px',
              letterSpacing: '0.05em',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            Со своим уставом в чужой монастырь не ходят
          </p>
          <div className="flex items-center gap-2 justify-center sm:justify-end">
              <label
                htmlFor="room-select"
                className="italic shrink-0 transition-colors duration-700 ease-in-out"
                style={{
                  fontSize: '13px',
                  color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
                }}
              >
                комната:
              </label>
              <select
                id="room-select"
                value={currentRoom}
                onChange={(e) => setCurrentRoom(e.target.value)}
                disabled={isHydrating || isLoading}
                className={clsx(
                  'rounded-md border outline-none transition-colors duration-300 disabled:opacity-60 cursor-pointer',
                  isDark ? 'dom-input-dark' : 'dom-input',
                )}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                }}
              >
                {rooms.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
        </div>
        {showSearch && (
          <div className="w-full px-0 sm:px-6 mt-4 flex items-center gap-2">
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

      {/* Область сообщений — та же ширина что input bar, для гармонии.
          + Pull-to-refresh на мобильнике (F.5). */}
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto py-6"
        onTouchStart={handlePtrTouchStart}
        onTouchMove={handlePtrTouchMove}
        onTouchEnd={handlePtrTouchEnd}
        onTouchCancel={handlePtrTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center italic transition-opacity duration-100"
            style={{
              height: pullDistance,
              opacity: Math.min(1, pullDistance / PTR_TRIGGER_PX),
              fontSize: '14px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            {ptrReady ? 'Отпусти — обновлю нить' : 'Потяни ниже…'}
          </div>
        )}
        <div className="w-full px-4 sm:px-10">
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
          {isLoading && !searchQuery && (
            <div className="flex items-center gap-3">
              <TypingIndicator />
              <button
                onClick={handleCancelStream}
                className="italic underline underline-offset-4 decoration-1 transition-opacity hover:opacity-100"
                style={{
                  fontSize: '12px',
                  opacity: 0.7,
                  color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                }}
                aria-label="Прервать"
                title="Прервать ответ Адама"
              >
                прервать
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Frozen banner — вместо поля ввода, когда Адам заморожен (F.6). */}
      {frozenState?.is_frozen ? (
        <div
          className="shrink-0 border-t py-5 sm:py-6 transition-colors duration-700 ease-in-out"
          style={{
            borderColor: 'var(--color-terracotta-dark)',
            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
          }}
        >
          <div className="w-full px-4 sm:px-10 flex flex-col items-center text-center gap-2">
            <p
              className="italic"
              style={{
                fontSize: 'clamp(16px, 3.2vw, 18px)',
                color: 'var(--color-terracotta-dark)',
                letterSpacing: '0.04em',
              }}
            >
              Адам отдыхает
            </p>
            <p
              className="italic opacity-90"
              style={{
                fontSize: 'clamp(13px, 2.6vw, 15px)',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-umber)',
              }}
            >
              {frozenState.frozen_reason
                ? <>Причина: {frozenState.frozen_reason}</>
                : <>Родители временно закрыли чат.</>}
            </p>
            {whoami?.role === 'parent' && (
              <a
                href="/kill-switch"
                className="mt-2 italic underline underline-offset-4 decoration-1"
                style={{
                  fontSize: '14px',
                  color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                }}
              >
                открыть kill-switch →
              </a>
            )}
          </div>
        </div>
      ) : (
      <div
        className="shrink-0 border-t py-4 sm:py-5 transition-colors duration-700 ease-in-out"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="w-full px-4 sm:px-10 flex items-stretch gap-2 sm:gap-3">
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
      )}

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
