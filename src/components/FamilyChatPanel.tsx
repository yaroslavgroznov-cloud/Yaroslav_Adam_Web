// Family group chat — Sprint F.10, 2026-05-25.
// Полл 3 сек на новые сообщения, optimistic POST.
import React, { useEffect, useRef, useState } from 'react'

import { useDarkMode } from '../hooks/useDarkMode'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  familyChatList,
  familyChatMessages,
  familyChatPostMessage,
} from '../api/familyChat'
import type { ChatMessage, ChatConversation } from '../api/familyChat'
import { adminWhoami } from '../api/admin'
import { filesConfig, uploadFile } from '../api/files'
import type { FileMeta, FilesConfig } from '../api/files'
import { AttachmentChip } from './AttachmentChip'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MessageRow({ msg, isDark, isMine }: {
  msg: ChatMessage; isDark: boolean; isMine: boolean
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
        {isAdam ? t('familyChat.adam_label') : msg.by_name} · {formatTime(msg.created_at)}
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
        {msg.attachment && (
          <AttachmentChip attachment={msg.attachment} isDark={isDark} />
        )}
      </div>
    </div>
  )
}

export function FamilyChatPanel(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [conv, setConv] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [adamThinking, setAdamThinking] = useState(false)
  const [error, setError] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  // F.11: attachment state
  const [filesCfg, setFilesCfg] = useState<FilesConfig | null>(null)
  const [pendingFile, setPendingFile] = useState<FileMeta | null>(null)
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
        const m = e instanceof Error ? e.message : t('familyChat.load_failed')
        if (m.includes('403')) setError(t('familyChat.not_in_circle'))
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

  async function handleFilePick(file: File): Promise<void> {
    if (!filesCfg?.enabled) return
    if (file.size > filesCfg.max_bytes) {
      setError(t('attachment.too_large', { mb: (filesCfg.max_bytes / 1024 / 1024).toFixed(0) }))
      return
    }
    setUploading(true)
    setError('')
    try {
      const meta = await uploadFile(file)
      setPendingFile(meta)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('attachment.upload_failed'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSend(): Promise<void> {
    if (!conv) return
    const content = input.trim()
    if ((!content && !pendingFile) || busy) return
    // Если только файл без текста — даём пустую "."
    const effectiveContent = content || (pendingFile ? '📎' : '')
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const attId = pendingFile?.id ?? null
    setPendingFile(null)
    setBusy(true)
    const willTriggerAdam = /(?:^|[\s.,!?:;])(@?\s*(adam|адам))(?:$|[\s.,!?:;])/iu.test(effectiveContent)
    if (willTriggerAdam) setAdamThinking(true)
    try {
      const newMsgs = await familyChatPostMessage(conv.id, effectiveContent, attId)
      setMessages((prev) => [...prev, ...newMsgs])
      if (newMsgs.length > 0) {
        lastIdRef.current = newMsgs[newMsgs.length - 1].id
      }
      if (newMsgs.some((m) => m.is_adam)) setAdamThinking(false)
      else if (!willTriggerAdam) setAdamThinking(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('familyChat.send_failed'))
      setAdamThinking(false)
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void handleFilePick(f)
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
              {conv?.title ?? t('familyChat.title')}
            </span>
            <span className="italic" style={{ fontSize: '12px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}>
              {t('familyChat.subtitle')}
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
            {t('familyChat.empty_title')}
            <br/>
            <span className="text-xs">{t('familyChat.empty_hint').split('<0>').map((part, i) => {
              if (i === 0) return part
              const [tag, rest] = part.split('</0>')
              return <React.Fragment key={i}><b>{tag}</b>{rest}</React.Fragment>
            })}</span>
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
                {t('familyChat.adam_typing')}
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

      {/* Pending attachment preview */}
      {pendingFile && (
        <div
          className="shrink-0 border-t px-4 sm:px-10 py-2 flex items-center gap-3"
          style={{
            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            backgroundColor: isDark ? 'rgba(168,140,95,0.10)' : 'rgba(168,140,95,0.06)',
          }}
        >
          <span className="italic" style={{ fontSize: '13px',
            color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}>
            {t('attachment.attached_label')}
          </span>
          <span style={{ fontSize: '13px' }}>
            {pendingFile.is_image ? '🖼' : '📎'} {pendingFile.original_name}
          </span>
          <button
            onClick={() => setPendingFile(null)}
            className="italic underline underline-offset-4 decoration-1 ml-auto"
            style={{ fontSize: '12px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            {t('attachment.remove')}
          </button>
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
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFilePick(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || busy}
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
          placeholder={t('familyChat.input_placeholder')}
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
          {busy ? t('common.loading') : t('common.send')}
        </button>
      </div>
    </div>
  )
}
