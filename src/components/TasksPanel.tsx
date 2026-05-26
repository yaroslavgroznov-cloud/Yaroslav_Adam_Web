// TasksPanel — F.18, 2026-05-26.
// /tasks — Творец и Юля могут создавать поручения Адаму и видеть результаты.
//
// UI:
//  - Форма "Дай Адаму поручение" (title + instructions)
//  - Таблица последних 50 поручений со статусом
//  - Клик на запись → детали (раскрывается inline)
//  - Polling раз в 5 сек, пока есть pending/running — показывает прогресс
import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  taskCancel, taskCreate, taskGet, tasksList, taskSeen,
} from '../api/tasks'
import type { AdamTask, TaskStatus } from '../api/tasks'

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusColor(s: TaskStatus, isDark: boolean): string {
  switch (s) {
    case 'pending': return isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
    case 'running': return isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)'
    case 'done': return isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
    case 'failed': return 'var(--color-terracotta-dark)'
    case 'cancelled': return isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)'
  }
}

export function TasksPanel(): React.ReactElement {
  const { t } = useTranslation()
  const [isDark, setIsDark] = useState(false)
  const [tasks, setTasks] = useState<AdamTask[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    const hour = new Date().getHours()
    setIsDark(hour >= 19 || hour < 7)
  }, [])

  async function refresh(): Promise<void> {
    try {
      const list = await tasksList()
      setTasks(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tasks.load_failed'))
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  // Polling пока есть pending/running
  useEffect(() => {
    const hasActive = tasks.some((x) => x.status === 'pending' || x.status === 'running')
    if (!hasActive) {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    if (pollRef.current === null) {
      pollRef.current = window.setInterval(() => void refresh(), 5000)
    }
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [tasks])

  async function handleCreate(): Promise<void> {
    const tt = title.trim()
    const ii = instructions.trim()
    if (!tt || !ii) {
      setError(t('tasks.need_both'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await taskCreate(tt, ii)
      setTasks((prev) => [created, ...prev])
      setTitle('')
      setInstructions('')
      setToast(t('tasks.created'))
      setTimeout(() => setToast(''), 2200)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tasks.create_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(id: number): Promise<void> {
    try {
      const updated = await taskCancel(id)
      setTasks((prev) => prev.map((x) => x.id === id ? updated : x))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    }
  }

  async function handleOpen(id: number): Promise<void> {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    try {
      const t2 = await taskGet(id)
      setTasks((prev) => prev.map((x) => x.id === id ? t2 : x))
      if (t2.status === 'done' && t2.seen_at === null) {
        const s = await taskSeen(id)
        setTasks((prev) => prev.map((x) => x.id === id ? s : x))
      }
    } catch { /* tolerated */ }
  }

  return (
    <div
      className="min-h-screen font-serif transition-colors duration-700"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/dom_groznovyh.jpg"
              alt="Герб"
              className="h-[60px] w-auto select-none"
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
              }}
            />
            <h1 className="font-medium" style={{ fontSize: '24px', letterSpacing: '0.03em' }}>
              {t('tasks.title')}
            </h1>
          </div>
          <a
            href="/"
            className="italic underline underline-offset-4 decoration-1"
            style={{ fontSize: '14px', color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            {t('common.back_to_adam')}
          </a>
        </header>

        <p className="italic mb-5 opacity-80" style={{ fontSize: '14px' }}>
          {t('tasks.intro')}
        </p>

        {/* Форма */}
        <section
          className="rounded-md border p-5 mb-7"
          style={{
            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
          }}
        >
          <h2 className="mb-3" style={{ fontSize: '17px', letterSpacing: '0.04em' }}>
            {t('tasks.form_title')}
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.title_placeholder')}
            disabled={busy}
            className={clsx('w-full rounded-md border outline-none mb-3', isDark ? 'dom-input-dark' : 'dom-input')}
            style={{
              padding: '10px 14px',
              fontSize: '15px',
              fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          />
          <textarea
            rows={5}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t('tasks.instructions_placeholder')}
            disabled={busy}
            className={clsx('w-full rounded-md border outline-none', isDark ? 'dom-input-dark' : 'dom-input')}
            style={{
              padding: '10px 14px',
              fontSize: '15px',
              fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          />
          <div className="flex items-center justify-between gap-3 mt-3">
            {error && (
              <span className="italic" style={{ color: 'var(--color-terracotta-dark)', fontSize: '13px' }}>
                {error}
              </span>
            )}
            {toast && !error && (
              <span className="italic opacity-80" style={{ fontSize: '13px' }}>
                {toast}
              </span>
            )}
            <button
              onClick={() => void handleCreate()}
              disabled={busy || !title.trim() || !instructions.trim()}
              className="rounded-md border italic disabled:opacity-50 ml-auto"
              style={{
                padding: '8px 18px',
                fontSize: '14px',
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
              }}
            >
              {busy ? '…' : t('tasks.send_btn')}
            </button>
          </div>
        </section>

        {/* Список */}
        <h2 className="mb-3" style={{ fontSize: '17px', letterSpacing: '0.04em' }}>
          {t('tasks.list_title')}
        </h2>
        {tasks.length === 0 && (
          <p className="italic opacity-70" style={{ fontSize: '14px' }}>
            {t('tasks.empty')}
          </p>
        )}
        <ul className="space-y-2">
          {tasks.map((tt) => {
            const isOpen = openId === tt.id
            return (
              <li
                key={tt.id}
                className="rounded-md border"
                style={{
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                }}
              >
                <button
                  onClick={() => void handleOpen(tt.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3"
                >
                  <span
                    className="italic shrink-0"
                    style={{ fontSize: '12px', color: statusColor(tt.status, isDark), minWidth: 86 }}
                  >
                    {t(`tasks.status_${tt.status}`)}
                  </span>
                  <span className="flex-1 truncate" style={{ fontSize: '14px' }}>
                    {tt.title}
                  </span>
                  <span className="italic opacity-70 shrink-0" style={{ fontSize: '12px' }}>
                    {fmtTime(tt.created_at)}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1" style={{ fontSize: '14px' }}>
                    <p className="italic opacity-70 mb-2" style={{ fontSize: '12px' }}>
                      {t('tasks.instructions_label')}
                    </p>
                    <pre className="whitespace-pre-wrap font-serif mb-3" style={{ fontFamily: 'inherit' }}>
                      {tt.instructions}
                    </pre>
                    {tt.status === 'done' && tt.result && (
                      <>
                        <p className="italic opacity-70 mb-2" style={{ fontSize: '12px' }}>
                          {t('tasks.result_label')}
                        </p>
                        <pre className="whitespace-pre-wrap font-serif" style={{ fontFamily: 'inherit' }}>
                          {tt.result}
                        </pre>
                        {tt.r2_download_url && (
                          <p className="mt-3">
                            <a
                              href={tt.r2_download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="italic underline underline-offset-4 decoration-1"
                              style={{
                                fontSize: '13px',
                                color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)',
                              }}
                            >
                              {t('tasks.download_full')}
                            </a>
                          </p>
                        )}
                        <p className="italic opacity-60 mt-3" style={{ fontSize: '12px' }}>
                          {t('tasks.delivery_status', {
                            email: tt.email_delivered ? '✓' : '—',
                            messenger: tt.messenger_delivered ? '✓' : '—',
                          })}
                        </p>
                      </>
                    )}
                    {tt.status === 'failed' && (
                      <p style={{ color: 'var(--color-terracotta-dark)', fontStyle: 'italic' }}>
                        {tt.error ?? t('tasks.failed_generic')}
                      </p>
                    )}
                    {tt.status === 'pending' && (
                      <button
                        onClick={() => void handleCancel(tt.id)}
                        className="italic underline underline-offset-4"
                        style={{ fontSize: '13px', color: 'var(--color-terracotta-dark)' }}
                      >
                        {t('tasks.cancel_btn')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
