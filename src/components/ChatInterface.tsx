// ChatInterface — копия DRUG/frontend/src/components/ChatInterface.tsx,
// адаптированная под Vite/React + CF Access (вместо JWT-логина).
// Sprint F.1: + обновить контекст / закрыть диалог / локальный поиск + mobile width.
// Sprint F.2: + dropdown 10 культурных комнат, per-(user, room) conversation.
// 2026-05-25.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import i18n from 'i18next'
import { useTranslation } from 'react-i18next'

import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { CallFamilyModal } from './CallFamilyModal'
import { FamilyInbox } from './FamilyInbox'
import { HeaderOverflowMenu } from './HeaderOverflowMenu'
import type { OverflowItem } from './HeaderOverflowMenu'
import { IosInstallHint } from './IosInstallHint'
import { LanguageSwitcher } from './LanguageSwitcher'
// 2026-07-02: DarkwebSearchModal + LlmModelSwitcher мигрировали в
// Yaroslav_Kabinet_Tvortsa (privat.groznov.uk).
import { VoiceModal } from './VoiceModal'
import { useDarkMode } from '../hooks/useDarkMode'
import { notificationsHelp } from '../utils/notificationsHelp'
import { adamChatStream, adamGetActive, adamGetRooms } from '../api/adam'
import type { RoomInfo } from '../api/adam'
import { adminGetState, adminWhoami } from '../api/admin'
import type { SystemState, Whoami } from '../api/admin'
import { familyCallSeen, familyCallsReceived } from '../api/family'
import type { FamilyCall } from '../api/family'
import { filesConfig, uploadFile } from '../api/files'
import type { FileMeta, FilesConfig } from '../api/files'
import { usePush } from '../hooks/usePush'
import type { ChatMessage } from '../types'

const ROOM_STORAGE_KEY = 'adam.currentRoom'
const DEFAULT_ROOM_FALLBACK = 'vostochnoslavyanskaya'

// 2026-06-16: было 1 файл, стало до 5 на сообщение. Должно соответствовать
// MAX_ATTACHMENTS_PER_MESSAGE в backend/app/routers/adam_external.py.
const MAX_ATTACHMENTS = 5
const MAX_TOTAL_BYTES = 30 * 1024 * 1024  // 30 MB суммарно — защита контекста LLM
// Расширили с image+pdf до того же набора что и кабинеты: image/* + PDF + Word + plain/markdown.
const ACCEPT_STRING = (
  'image/*,application/pdf,' +
  '.doc,.docx,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'text/plain,text/markdown'
)

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
  const { t } = useTranslation()
  const [showLangSwitcher, setShowLangSwitcher] = useState(false)
  // 2026-07-02: showLlmSwitcher + showDarkweb удалены (панели мигрировали
  // в Yaroslav_Kabinet_Tvortsa).
  const [showVoice, setShowVoice] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)
  const [toast, setToast] = useState('')
  const { isDark, pref: darkPref, setPref: setDarkPref } = useDarkMode()
  const [currentDate, setCurrentDate] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Mobile collapse: на телефоне большой header (герб 52px + кнопки) и composer
  // (textarea 14vw + buttons) занимают почти весь экран, диалог зажат. Сворачиваем
  // оба по умолчанию на mobile; тонкие mini-bar для разворачивания. Desktop игнорирует.
  const [mobilePanelsExpanded, setMobilePanelsExpanded] = useState(false)
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
  // F.11: file attachment state. 2026-06-16: множественные файлы (до 5).
  const [filesCfg, setFilesCfg] = useState<FilesConfig | null>(null)
  const [pendingFiles, setPendingFiles] = useState<FileMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const ptrStartYRef = useRef<number | null>(null)
  const ptrActiveRef = useRef(false)

  const PTR_TRIGGER_PX = 70   // > этого — релиз обновляет
  const PTR_MAX_PX = 120      // макс растяжение индикатора

  // Дата (по клиентскому часу). Тема приходит из useDarkMode (F.32).
  useEffect(() => {
    const now = new Date()
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
    void (async () => {
      try {
        setFilesCfg(await filesConfig())
      } catch { /* files отключены */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFilePick(fileList: FileList | File[] | null): Promise<void> {
    if (!filesCfg?.enabled || !fileList) return
    const incoming = Array.from(fileList)
    if (incoming.length === 0) return

    // 1. Лимит количества: max 5 — берём первые free.
    const free = Math.max(0, MAX_ATTACHMENTS - pendingFiles.length)
    if (free === 0) {
      showToast(t('attachment.limit_reached', { n: MAX_ATTACHMENTS, defaultValue: `Лимит ${MAX_ATTACHMENTS} файлов на сообщение.` }))
      return
    }
    const slice = incoming.slice(0, free)
    const droppedExtra = incoming.length - slice.length

    // 2. Per-file size + 3. Total size (учёт уже прикреплённых).
    const alreadyBytes = pendingFiles.reduce((sum, f) => sum + f.size_bytes, 0)
    const accepted: File[] = []
    let runningTotal = alreadyBytes
    for (const f of slice) {
      if (f.size > filesCfg.max_bytes) {
        showToast(t('attachment.too_large', { mb: (filesCfg.max_bytes / 1024 / 1024).toFixed(0) }))
        continue
      }
      if (runningTotal + f.size > MAX_TOTAL_BYTES) {
        showToast(t('attachment.total_too_large', { mb: (MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0), defaultValue: `Суммарный размер вложений превышает ${MAX_TOTAL_BYTES / 1024 / 1024} MB.` }))
        break
      }
      accepted.push(f)
      runningTotal += f.size
    }
    if (accepted.length === 0) return

    setUploading(true)
    try {
      // Параллельная загрузка — быстрее, чем последовательно.
      const uploaded = await Promise.all(accepted.map((f) => uploadFile(f)))
      setPendingFiles((prev) => [...prev, ...uploaded])
      if (droppedExtra > 0) {
        showToast(t('attachment.limit_reached', { n: MAX_ATTACHMENTS, defaultValue: `Лимит ${MAX_ATTACHMENTS} файлов на сообщение.` }))
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('attachment.upload_failed'))
    } finally {
      setUploading(false)
    }
  }

  function removePendingFile(id: number): void {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }

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
      if (opts.silent) showToast(t('toasts.context_refreshed'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('toasts.context_load_failed')
      showToast(msg)
    } finally {
      setIsHydrating(false)
    }
  }

  function adjustTextareaHeight(): void {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    // F.36: расширяемся до maxHeight из style (~35vh), дальше включается
    // overflowY:auto и появляется внутренняя прокрутка длинного вопроса.
    const css = window.getComputedStyle(el)
    const maxHeightPx = parseFloat(css.maxHeight) || 340
    el.style.height = Math.min(el.scrollHeight, maxHeightPx) + 'px'
  }

  async function handleSend(): Promise<void> {
    const userMessage = input.trim()
    if ((!userMessage && pendingFiles.length === 0) || isLoading) return

    const effectiveContent = userMessage || (pendingFiles.length > 0 ? '📎' : '')
    const attIds = pendingFiles.map((f) => f.id)
    setPendingFiles([])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((prev) => [...prev, { role: 'user', content: effectiveContent }])
    setIsLoading(true)

    // Резервируем пустой assistant-bubble, который будет расти по дельтам.
    // Первый токен → isLoading=false (TypingIndicator уходит, появляется текст).
    let firstDeltaSeen = false
    let assistantStarted = false

    await new Promise<void>((resolve) => {
      const abort = adamChatStream(effectiveContent, currentRoom, {
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
          showToast(detail || t('toasts.generic_error'))
          // Если ничего не успело прийти — убираем пустой assistant bubble.
          if (!assistantStarted) {
            // ничего не добавляли — ничего не убираем
          }
          resolve()
        },
      }, {}, attIds.length > 0 ? attIds : null)
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
        content: (last.content || '') + t('chat.interrupt_marker'),
      }
      return next
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // F.61: единый паттерн с кабинетом — Ctrl/Cmd+Enter отправляет,
    // Enter даёт новую строку (важно для длинных разговоров с Адамом).
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
    showToast(t('toasts.screen_cleared'))
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

      {/* Mobile mini-header: герб + ≡ toggle. Виден когда header свёрнут на mobile. */}
      <div
        className={clsx(
          'md:hidden shrink-0 px-4 py-1.5 flex items-center justify-between border-b transition-colors duration-700 ease-in-out',
          mobilePanelsExpanded && 'hidden',
        )}
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <img
          src="/dom_groznovyh.jpg"
          alt={t('common.crest_full_alt')}
          className="h-7 w-auto select-none"
          style={{
            mixBlendMode: isDark ? 'normal' : 'multiply',
            filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
          }}
        />
        <span className="italic truncate flex-1 mx-3" style={{ fontSize: '14px', letterSpacing: '0.03em' }}>
          {t('header.title')}
        </span>
        <button
          type="button"
          onClick={() => setMobilePanelsExpanded(true)}
          className="shrink-0 inline-flex items-center justify-center rounded-md border"
          style={{
            width: 30, height: 30, fontSize: '15px',
            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            backgroundColor: 'transparent',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
          }}
          aria-label={t('cabinets.expand_panels')}
          title={t('cabinets.expand_panels')}
        >
          ≡
        </button>
      </div>

      {/* Хедер: герб + Адам + действия */}
      <header
        className={clsx(
          'shrink-0 px-4 sm:px-10 py-4 sm:py-5 items-center justify-between gap-2 sm:gap-4 border-b transition-colors duration-700 ease-in-out md:flex',
          mobilePanelsExpanded ? 'flex' : 'hidden',
        )}
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <img
            src="/dom_groznovyh.jpg"
            alt={t('common.crest_full_alt')}
            className="h-[52px] sm:h-[90px] w-auto select-none shrink-0"
            style={{
              mixBlendMode: isDark ? 'normal' : 'multiply',
              filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
            }}
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-medium truncate" style={{ fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '0.03em' }}>
              {t('header.title')}
            </span>
            <span
              className="italic hidden sm:inline transition-colors duration-700 ease-in-out"
              style={{
                fontSize: '13px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
              }}
            >
              {t('header.subtitle')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Главные 4 кнопки видны всегда: семейный чат, позвать, поиск, обновить */}

          {/* Стол · общий семейный (F.56) — до 12 мест.
              Раньше «Семейный чат» (F.10). */}
          <a
            href="/stol"
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label={t('headerActions.stol')}
            title={t('headerActions.stol')}
          >
            {/* Круглый стол: овал-столешница с двумя «местами» по бокам */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="12" rx="9" ry="4.5" />
              <circle cx="3.5" cy="12" r="1.3" />
              <circle cx="20.5" cy="12" r="1.3" />
              <circle cx="12" cy="6.8" r="1.3" />
              <circle cx="12" cy="17.2" r="1.3" />
            </svg>
          </a>

          {/* Позвать своего */}
          <button
            onClick={() => setShowCallModal(true)}
            className={iconBtnClass}
            style={iconBtnStyle}
            aria-label={t('headerActions.call_family')}
            title={t('headerActions.call_family')}
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
            aria-label={t('headerActions.search')}
            title={t('headerActions.search')}
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
            aria-label={t('headerActions.refresh')}
            title={t('headerActions.refresh')}
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
                label: t('headerActions.close_dialog'),
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
                  ? t('headerActions.notifications_on')
                  : push.status === 'denied' ? t('headerActions.notifications_off')
                  : push.status === 'needs-pwa-ios' ? t('headerActions.notifications_pwa_needed')
                  : t('headerActions.notifications_enable')
                items.push({
                  key: 'push',
                  label: pushLabel,
                  onClick: () => {
                    if (push.status === 'subscribed') void push.unsubscribe()
                    else if (push.status === 'denied') {
                      const help = notificationsHelp(i18n.language)
                      showToast(`${t('toasts.notifications_blocked')} ${help.label}`)
                      if (help.url) window.open(help.url, '_blank', 'noopener')
                    }
                    else if (push.status === 'needs-pwa-ios')
                      showToast(t('toasts.notifications_pwa_hint'))
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
              // F.41: Кабинеты — все
              items.push({
                key: 'cabinets',
                label: t('headerActions.cabinets'),
                href: '/cabinets',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                ),
              })
              // F.56: Стол — общий семейный, до 12 мест
              items.push({
                key: 'stol',
                label: t('headerActions.stol'),
                href: '/stol',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="13" rx="9" ry="4" />
                    <circle cx="3.5" cy="13" r="1.2" />
                    <circle cx="20.5" cy="13" r="1.2" />
                    <circle cx="12" cy="8.2" r="1.2" />
                    <circle cx="12" cy="17.8" r="1.2" />
                  </svg>
                ),
              })
              // 2026-06-23: Архив песен — канон Дома, /house-songs
              items.push({
                key: 'archive',
                label: t('headerActions.archive'),
                href: '/archive',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7l9-4 9 4v3H3V7z" />
                    <path d="M5 10v9h14v-9" />
                    <line x1="10" y1="13" x2="14" y2="13" />
                  </svg>
                ),
              })
              // F.15 Voice — все
              items.push({
                key: 'voice',
                label: t('headerActions.voice'),
                onClick: () => setShowVoice(true),
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="13" rx="3" />
                    <path d="M19 11a7 7 0 0 1-14 0" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                ),
              })
              // Parents-only
              if (whoami?.role === 'parent') {
                items.push({
                  key: 'metrics',
                  label: t('headerActions.metrics'),
                  href: '/admin/metrics',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 17 9 11 13 15 21 7" />
                      <polyline points="14 7 21 7 21 14" />
                    </svg>
                  ),
                })
                // 2026-07-02: kill-switch мигрировал в Yaroslav_Kabinet_Tvortsa
                // (privat.groznov.uk) — управляющие панели на публичном фронте
                // = архитектурная ошибка ([[feedback_backend_creator_frontend_guests]])
                items.push({
                  key: 'tasks',
                  label: t('headerActions.tasks'),
                  href: '/tasks',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  ),
                })
                // 2026-07-02: family/slots roster → Yaroslav_Kabinet_Tvortsa
              }
              // 2026-07-02: /me (CreatorSettings), Darkweb search, LLM model
              // switcher — все мигрировали в Yaroslav_Kabinet_Tvortsa. Гости на
              // adam.groznov.uk управляющие панели не видят вовсе. См. правило
              // [[feedback_backend_creator_frontend_guests]] в auto-memory СС.
              // F.32: тема (Auto → Dark → Light → Auto)
              items.push({
                key: 'theme',
                label: t(`headerActions.theme_${darkPref}`),
                onClick: () => {
                  const next = darkPref === 'auto' ? 'dark' : darkPref === 'dark' ? 'light' : 'auto'
                  setDarkPref(next)
                  showToast(t(`toasts.theme_${next}`))
                },
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ),
              })
              // Language switcher — все, всегда
              items.push({
                key: 'language',
                label: t('headerActions.language'),
                onClick: () => setShowLangSwitcher(true),
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                ),
              })
              // Logout
              items.push({
                key: 'logout',
                label: t('header.logout'),
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
          {/* Mobile ▴ — свернуть весь header в мини-bar */}
          <button
            type="button"
            onClick={() => setMobilePanelsExpanded(false)}
            className="md:hidden shrink-0 inline-flex items-center justify-center rounded-md border"
            style={{
              width: 30, height: 30, fontSize: '14px',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: 'transparent',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
            aria-label={t('cabinets.collapse_panels')}
            title={t('cabinets.collapse_panels')}
          >
            ▴
          </button>
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
                ? t('familyCall.called_delivered', { name })
                : t('familyCall.called_no_email', { name }),
            )
          }}
        />
      )}

      {/* Языковая модалка */}
      {showLangSwitcher && (
        <LanguageSwitcher isDark={isDark} onClose={() => setShowLangSwitcher(false)} />
      )}

      {/* 2026-07-02: LlmModelSwitcher + DarkwebSearchModal мигрировали в
          Yaroslav_Kabinet_Tvortsa (privat.groznov.uk) */}

      {/* F.15 Voice — OpenAI Realtime */}
      {showVoice && (
        <VoiceModal isDark={isDark} onClose={() => setShowVoice(false)} />
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
            {t('header.motto')}
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
                {t('header.room_label')}
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
                    {t(`rooms.${r.slug}`, { defaultValue: r.name })}
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
              placeholder={t('search.placeholder')}
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
        onDragOver={(e) => {
          if (!filesCfg?.enabled) return
          e.preventDefault()
          if (!isDragOver) setIsDragOver(true)
        }}
        onDragLeave={(e) => {
          // Срабатывает на детях — не сбрасываем флаг, пока курсор внутри контейнера.
          if (e.currentTarget === e.target) setIsDragOver(false)
        }}
        onDrop={(e) => {
          setIsDragOver(false)
          if (!filesCfg?.enabled) return
          e.preventDefault()
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void handleFilePick(e.dataTransfer.files)
          }
        }}
        style={isDragOver ? {
          outline: `2px dashed ${isDark ? 'var(--color-ochre-soft)' : 'var(--color-terracotta)'}`,
          outlineOffset: -8,
        } : undefined}
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
            {ptrReady ? t('chat.ptr_ready') : t('chat.ptr_pull')}
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
              {t('chat.hydrating')}
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
              {t('chat.empty_greeting')}
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
              {t('search.not_found', { query: searchQuery })}
            </p>
          )}
          {displayedMessages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} isDark={isDark} />
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
                aria-label={t('chat.interrupt')}
                title={t('chat.interrupt')}
              >
                {t('chat.interrupt')}
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
              {t('frozen.title')}
            </p>
            <p
              className="italic opacity-90"
              style={{
                fontSize: 'clamp(13px, 2.6vw, 15px)',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-umber)',
              }}
            >
              {frozenState.frozen_reason
                ? <>{t('frozen.reason_prefix')} {frozenState.frozen_reason}</>
                : <>{t('frozen.no_reason')}</>}
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
                {t('frozen.open_kill_switch')}
              </a>
            )}
          </div>
        </div>
      ) : (
      <>
      {/* F.11 / 2026-06-16: pending attachments preview (до 5 chip'ов). */}
      {pendingFiles.length > 0 && (
        <div
          className="shrink-0 border-t px-4 sm:px-10 py-2 flex items-center gap-2 flex-wrap"
          style={{
            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            backgroundColor: isDark ? 'rgba(168,140,95,0.10)' : 'rgba(168,140,95,0.06)',
          }}
          role="region"
          aria-live="polite"
          aria-label={t('attachment.attached_label')}
        >
          <span className="italic shrink-0" style={{ fontSize: '13px',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}>
            {t('attachment.attached_label')} ({pendingFiles.length}/{MAX_ATTACHMENTS}):
          </span>
          {pendingFiles.map((f) => (
            <span
              key={f.id}
              className="italic rounded-md border inline-flex items-center gap-1.5"
              style={{
                fontSize: '12px',
                padding: '3px 6px 3px 8px',
                maxWidth: '220px',
                borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
              }}
              title={f.original_name}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.is_image ? '🖼' : '📎'} {f.original_name}
              </span>
              <button
                type="button"
                onClick={() => removePendingFile(f.id)}
                aria-label={t('attachment.remove')}
                title={t('attachment.remove')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0 2px', lineHeight: 1,
                  fontSize: '14px',
                  color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Mobile mini-composer: ✎ tap to write. Виден когда composer свёрнут. */}
      <button
        type="button"
        onClick={() => setMobilePanelsExpanded(true)}
        className={clsx(
          'md:hidden shrink-0 w-full text-left italic border-t px-4 py-2.5',
          mobilePanelsExpanded && 'hidden',
        )}
        style={{
          fontSize: '14px',
          fontFamily: 'inherit',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
          backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          opacity: 0.7,
        }}
        aria-label={t('cabinets.tap_to_write')}
      >
        ✎ {t('cabinets.tap_to_write')}
      </button>
      <div
        className={clsx(
          'shrink-0 border-t py-4 sm:py-5 transition-colors duration-700 ease-in-out md:block',
          mobilePanelsExpanded ? 'block' : 'hidden',
        )}
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        <div className="w-full px-4 sm:px-10 flex items-stretch gap-2 sm:gap-3">
          {filesCfg?.enabled && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept={ACCEPT_STRING}
                aria-label={t('attachment.pick_file')}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    void handleFilePick(e.target.files)
                  }
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isLoading || isHydrating || pendingFiles.length >= MAX_ATTACHMENTS}
                className="shrink-0 inline-flex items-center justify-center rounded-md border disabled:opacity-50"
                style={{
                  width: 'clamp(48px, 9vw, 60px)',
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                }}
                aria-label={t('attachment.pick_file')}
                title={t('attachment.pick_file')}
              >
                {uploading ? (
                  <span className="italic" style={{ fontSize: '11px' }}>…</span>
                ) : (
                  /* 2026-06-16: скрепка вместо «+» по просьбе Творца, унификация со Столом и кабинетами. */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                )}
              </button>
            </>
          )}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextareaHeight() }}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.input_placeholder')}
            disabled={isLoading || isHydrating}
            className={clsx(
              'flex-1 resize-none rounded-md border outline-none transition-colors duration-700 ease-in-out disabled:opacity-60',
              isDark ? 'dom-input-dark' : 'dom-input',
            )}
            style={{
              minHeight: 'clamp(72px, 14vw, 110px)',
              // F.36: ограничиваем высоту и включаем прокрутку, чтобы длинные
              // вопросы не растягивали textarea на весь экран.
              maxHeight: 'clamp(180px, 35vh, 340px)',
              overflowY: 'auto',
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
            type="button"
            onClick={() => void handleSend()}
            disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || isHydrating}
            aria-label={t('common.send')}
            title={t('common.send')}
            className={clsx(
              'shrink-0 italic rounded-md border transition-colors duration-700 ease-in-out disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
              isDark ? 'btn-send-night' : 'btn-send-day',
            )}
            style={{
              // Мобильный фикс: на узком экране кнопка = квадрат-иконка
              // (clamp width 56-110px), текст «Отправить» скрыт. На sm+ —
              // полная кнопка с иконкой + текстом.
              minHeight: 'clamp(72px, 14vw, 110px)',
              minWidth: 'clamp(56px, 14vw, 110px)',
              padding: 'clamp(10px, 2vw, 16px) clamp(10px, 2.5vw, 28px)',
              fontSize: 'clamp(14px, 2.6vw, 16px)',
              letterSpacing: '0.04em',
              fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
              color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
            }}
          >
            {/* Paper plane icon — всегда виден */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {/* Текст «Отправить» — только на sm+ */}
            <span className="hidden sm:inline">{t('common.send')}</span>
          </button>
        </div>
      </div>
      </>
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
        <span>{t('common.house_footer')}</span>
      </footer>
    </div>
  )
}
