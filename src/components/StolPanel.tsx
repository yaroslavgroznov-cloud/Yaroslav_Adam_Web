// Stol — Общий семейный стол. F.56, 2026-05-29.
// Раньше FamilyChatPanel (F.10). Переименован вместе с переосмыслением
// архитектуры памяти: один Адам у одного юзера в личных каналах +
// ОТДЕЛЬНО Стол как пространство встречи семьи, где Адам подтягивает
// нити говорящего из его сквозной памяти (личный чат + кабинеты).
// Поллинг 3 сек на новые сообщения, optimistic POST.
import React, { useEffect, useRef, useState } from 'react'

import { useDarkMode } from '../hooks/useDarkMode'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  stolList,
  stolMessages,
  stolPostMessage,
} from '../api/stol'
import type { StolMessage, StolConversation } from '../api/stol'
import { adminWhoami } from '../api/admin'
import { filesConfig, uploadFile } from '../api/files'
import type { FileMeta, FilesConfig } from '../api/files'
import { AttachmentChip } from './AttachmentChip'

// 2026-06-16: множественные attachments (до 5). Должно соответствовать
// MAX_ATTACHMENTS_PER_MESSAGE в backend/app/routers/stol.py.
const MAX_ATTACHMENTS = 5
const MAX_TOTAL_BYTES = 30 * 1024 * 1024  // 30 MB суммарно
const ACCEPT_STRING = (
  'image/*,application/pdf,' +
  '.doc,.docx,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'text/plain,text/markdown'
)

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MessageRow({ msg, isDark, isMine }: {
  msg: StolMessage; isDark: boolean; isMine: boolean
}): React.ReactElement {
  const { t } = useTranslation()
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
        {isAdam ? t('stol.adam_label') : msg.by_name} · {formatTime(msg.created_at)}
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
        {msg.attachments && msg.attachments.map((a) => (
          <AttachmentChip key={a.id} attachment={a} isDark={isDark} />
        ))}
      </div>
    </div>
  )
}

export function StolPanel(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  // Канон Brand Kit v1.2 (House of Groznov) — добавлено 2026-06-07
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const gold = isDark ? 'var(--color-house-gold-soft)' : 'var(--color-house-gold)'
  const [conv, setConv] = useState<StolConversation | null>(null)
  const [messages, setMessages] = useState<StolMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [adamThinking, setAdamThinking] = useState(false)
  const [error, setError] = useState('')
  // F.62.3.c (31.05): cooldown 3 сек после успешной отправки —
  // блокирует «нервный» повтор когда юзер думает что не отправилось.
  const [sendCooldown, setSendCooldown] = useState(false)
  // Notification «Адам слушает молча» — когда backend вернул user_msg
  // но без adam_msg (т.е. passive trigger не сработал, и это нормально).
  const [adamSilent, setAdamSilent] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  // F.11 / 2026-06-16: множественные attachments (до 5).
  const [filesCfg, setFilesCfg] = useState<FilesConfig | null>(null)
  const [pendingFiles, setPendingFiles] = useState<FileMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const lastIdRef = useRef<number>(0)

  // Mount: загружаем whoami + беседу + историю + files config
  useEffect(() => {
    void (async () => {
      try {
        try {
          const w = await adminWhoami()
          setCurrentUserEmail(w.email)
        } catch { /* без whoami isMine не определится — не критично */ }
        try {
          setFilesCfg(await filesConfig())
        } catch { /* files отключены — кнопка скрепки спрячется */ }
        const list = await stolList()
        if (list.length === 0) {
          setError(t('stol.no_conversations'))
          return
        }
        const c = list[0]
        setConv(c)
        const msgs = await stolMessages(c.id, { limit: 200 })
        setMessages(msgs)
        lastIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
      } catch (e) {
        const m = e instanceof Error ? e.message : t('stol.load_failed')
        if (m.includes('403')) setError(t('stol.not_in_circle'))
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
        const fresh = await stolMessages(conv.id, {
          afterId: lastIdRef.current,
          limit: 100,
        })
        if (!alive || fresh.length === 0) return
        setMessages((prev) => [...prev, ...fresh])
        lastIdRef.current = fresh[fresh.length - 1].id
        // Если последний — от Адама, убираем thinking-индикатор
        if (fresh.some((m: StolMessage) => m.is_adam)) setAdamThinking(false)
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

  async function handleFilePick(fileList: FileList | File[] | null): Promise<void> {
    if (!filesCfg?.enabled || !fileList) return
    const incoming = Array.from(fileList)
    if (incoming.length === 0) return

    const free = Math.max(0, MAX_ATTACHMENTS - pendingFiles.length)
    if (free === 0) {
      setError(t('attachment.limit_reached', { n: MAX_ATTACHMENTS, defaultValue: `Лимит ${MAX_ATTACHMENTS} файлов на сообщение.` }))
      return
    }
    const slice = incoming.slice(0, free)
    const droppedExtra = incoming.length - slice.length

    const alreadyBytes = pendingFiles.reduce((sum, f) => sum + f.size_bytes, 0)
    const accepted: File[] = []
    let runningTotal = alreadyBytes
    for (const f of slice) {
      if (f.size > filesCfg.max_bytes) {
        setError(t('attachment.too_large', { mb: (filesCfg.max_bytes / 1024 / 1024).toFixed(0) }))
        continue
      }
      if (runningTotal + f.size > MAX_TOTAL_BYTES) {
        setError(t('attachment.total_too_large', { mb: (MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0), defaultValue: `Суммарный размер вложений превышает ${MAX_TOTAL_BYTES / 1024 / 1024} MB.` }))
        break
      }
      accepted.push(f)
      runningTotal += f.size
    }
    if (accepted.length === 0) return

    setUploading(true)
    setError('')
    try {
      const uploaded = await Promise.all(accepted.map((f) => uploadFile(f)))
      setPendingFiles((prev) => [...prev, ...uploaded])
      if (droppedExtra > 0) {
        setError(t('attachment.limit_reached', { n: MAX_ATTACHMENTS, defaultValue: `Лимит ${MAX_ATTACHMENTS} файлов на сообщение.` }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('attachment.upload_failed'))
    } finally {
      setUploading(false)
    }
  }

  function removePendingFile(id: number): void {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSend(): Promise<void> {
    if (!conv) return
    const content = input.trim()
    if ((!content && pendingFiles.length === 0) || busy || sendCooldown) return
    // Если только файлы без текста — placeholder.
    const effectiveContent = content || (pendingFiles.length > 0 ? '📎' : '')
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const attIds = pendingFiles.map((f) => f.id)
    setPendingFiles([])
    setBusy(true)
    const willTriggerAdam = /(?:^|[\s.,!?:;])(@?\s*(adam|адам))(?:$|[\s.,!?:;])/iu.test(effectiveContent)
    if (willTriggerAdam) setAdamThinking(true)
    try {
      const newMsgs = await stolPostMessage(conv.id, effectiveContent, attIds.length > 0 ? attIds : null)
      setMessages((prev) => [...prev, ...newMsgs])
      if (newMsgs.length > 0) {
        lastIdRef.current = newMsgs[newMsgs.length - 1].id
      }
      const adamReplied = newMsgs.some((m: StolMessage) => m.is_adam)
      if (adamReplied) setAdamThinking(false)
      else if (!willTriggerAdam) setAdamThinking(false)
      // F.62.3.c: если Адам не вклинился — показываем «слушает молча»
      // на 4 сек (subtle hint, что система жива, а Адам осознанно молчит).
      if (!adamReplied) {
        setAdamSilent(true)
        setTimeout(() => setAdamSilent(false), 4000)
      }
      // Cooldown 3 сек на кнопку — против нервного повтора
      setSendCooldown(true)
      setTimeout(() => setSendCooldown(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('stol.send_failed'))
      setAdamThinking(false)
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFilePick(e.dataTransfer.files)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // F.61: единый паттерн — Ctrl/Cmd+Enter отправить, Enter — newline.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
          <img src="/dom_groznovyh.jpg" alt={t('common.crest_alt')} className="h-[52px] w-auto select-none shrink-0"
               style={{ mixBlendMode: isDark ? 'normal' : 'multiply',
                        filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none' }} />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-medium" style={{ fontSize: '20px', letterSpacing: '0.03em' }}>
              {conv?.title ?? t('stol.title')}
            </span>
            <span className="italic" style={{ fontSize: '12px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}>
              {t('stol.subtitle')}
            </span>
          </div>
        </div>
        <a
          href="/"
          className="italic underline underline-offset-4 decoration-1 shrink-0"
          style={{ fontSize: '14px',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
        >
          {t('common.back_to_adam')}
        </a>
      </header>

      {/* Messages — с drag-and-drop overlay */}
      <div
        className="flex-1 overflow-y-auto py-6 px-4 sm:px-10 relative"
        onDragOver={(e) => { if (filesCfg?.enabled) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {error && (
          <p className="italic text-center mt-8" style={{ color: 'var(--color-terracotta-dark)' }}>
            {error}
          </p>
        )}
        {!error && messages.length === 0 && (
          <p className="italic text-center mt-12 opacity-70" style={{ fontSize: '15px' }}>
            {t('stol.empty_title')}
            <br/>
            <span className="text-xs">{t('stol.empty_hint').split('<0>').map((part, i) => {
              if (i === 0) return part
              const [tag, rest] = part.split('</0>')
              return <React.Fragment key={i}><b>{tag}</b>{rest}</React.Fragment>
            })}</span>
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m: StolMessage) => (
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
                {t('stol.adam_typing')}
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
          {/* F.62.3.c: subtle hint когда Адам слышит, но осознанно молчит */}
          {adamSilent && !adamThinking && (
            <div className="flex justify-start mb-3">
              <div
                className="italic text-xs opacity-60 px-2 py-1"
                style={{ color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
              >
                ✦ {t('stol.adam_listens_silently')}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {dragOver && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none rounded"
            style={{
              backgroundColor: 'rgba(192,98,63,0.10)',
              border: '2px dashed var(--color-terracotta-dark)',
            }}
          >
            <p className="italic" style={{ color: 'var(--color-terracotta-dark)', fontSize: '16px' }}>
              {t('attachment.drop_zone')}
            </p>
          </div>
        )}
      </div>

      {/* Pending attachments preview (chips, до 5). 2026-06-16. */}
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
                  color: gold,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="shrink-0 border-t py-4 px-4 sm:px-10 flex items-stretch gap-2 sm:gap-3"
        style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
      >
        {/* Hidden file input + clip button */}
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
              disabled={uploading || busy || pendingFiles.length >= MAX_ATTACHMENTS}
              className="shrink-0 inline-flex items-center justify-center rounded-md border disabled:opacity-50"
              style={{
                width: 54, height: 54,
                borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                backgroundColor: 'transparent',
              }}
              aria-label={t('attachment.pick_file')}
              title={t('attachment.pick_file')}
            >
              {uploading ? (
                <span className="italic" style={{ fontSize: '11px' }}>…</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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
          placeholder={t('stol.input_placeholder')}
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
          type="button"
          onClick={() => void handleSend()}
          disabled={(!input.trim() && pendingFiles.length === 0) || busy || sendCooldown || !conv}
          aria-label={t('common.send')}
          title={t('common.send')}
          className="shrink-0 italic rounded-md border disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-2"
          style={{
            // Мобильный фикс: квадрат-иконка на узком экране, иконка+текст на sm+
            minWidth: 'clamp(54px, 14vw, 110px)',
            minHeight: 54,
            padding: '0 clamp(10px, 2.5vw, 22px)',
            fontSize: '14px',
            letterSpacing: '0.04em',
            fontFamily: 'inherit',
            backgroundColor: burgundy,
            color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
            borderColor: burgundy,
          }}
        >
          {busy ? (
            <span className="italic">…</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span className="hidden sm:inline">{t('common.send')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
