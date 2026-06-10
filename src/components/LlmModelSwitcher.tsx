// LlmModelSwitcher — переключение LLM-модели Адама. F.14, 2026-05-26.
// Видна ТОЛЬКО Творцу (whoami.is_creator=true). Backend дополнительно
// фильтрует на require_creator — даже если фронт обмануть, /admin/llm-model
// POST вернёт 403 Юле или гостю.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  adminLlmModelReset,
  adminLlmModelSet,
  adminLlmModelStatus,
} from '../api/admin'
import type { LlmModelStatus } from '../api/admin'

interface Props {
  isDark: boolean
  onClose: () => void
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LlmModelSwitcher({ isDark, onClose }: Props): React.ReactElement {
  const { t } = useTranslation()
  const [status, setStatus] = useState<LlmModelStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    void (async () => {
      try {
        setStatus(await adminLlmModelStatus())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'load failed')
      }
    })()
  }, [])

  async function pick(modelId: string): Promise<void> {
    if (busy || status?.current === modelId) return
    setBusy(true)
    setError('')
    try {
      setStatus(await adminLlmModelSet(modelId))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('llmSwitcher.select_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function resetDefault(): Promise<void> {
    if (busy || status?.is_default) return
    setBusy(true)
    setError('')
    try {
      setStatus(await adminLlmModelReset())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('llmSwitcher.select_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-md border p-5 sm:p-6 font-serif"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: 'var(--font-serif)',
          backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 style={{ fontSize: '20px', letterSpacing: '0.04em' }}>
              {t('llmSwitcher.title')}
            </h2>
            <p className="italic opacity-80 mt-1" style={{ fontSize: '13px' }}>
              {t('llmSwitcher.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="opacity-70 hover:opacity-100 shrink-0"
            style={{ color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {status === null && !error && (
          <p className="italic opacity-80 mt-4">{t('common.loading')}</p>
        )}

        {error && (
          <p className="italic mt-3" style={{
            color: 'var(--color-terracotta-dark)', fontSize: '13px',
          }}>{error}</p>
        )}

        {status && (
          <>
            <ul className="grid gap-2 mt-4">
              {status.available.map((m) => {
                const active = status.current === m.id
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => void pick(m.id)}
                      disabled={busy}
                      className="w-full text-left rounded-md border px-4 py-3 transition-colors disabled:opacity-60"
                      style={{
                        borderColor: active
                          ? 'var(--color-terracotta-dark)'
                          : (isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'),
                        backgroundColor: active
                          ? (isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)')
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>
                          {m.name}
                        </span>
                        {active && (
                          <span style={{ color: 'var(--color-terracotta-dark)', fontSize: '14px' }}>
                            ✓ {status.is_default && t('llmSwitcher.current_default')}
                          </span>
                        )}
                      </div>
                      <div className="italic opacity-80 mt-1" style={{ fontSize: '12px' }}>
                        {m.description}
                      </div>
                      <div className="opacity-60 mt-1" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        {m.id}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center justify-between mt-4 italic" style={{ fontSize: '12px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}>
              <span>
                {status.changed_by && t('llmSwitcher.changed_by', {
                  who: status.changed_by.startsWith('andrii') ? t('parents.tvorets')
                       : status.changed_by.startsWith('julia') ? t('parents.yulia')
                       : status.changed_by,
                  when: formatDateTime(status.changed_at),
                })}
              </span>
              {!status.is_default && (
                <button
                  onClick={() => void resetDefault()}
                  disabled={busy}
                  className="underline underline-offset-4 decoration-1"
                  style={{ color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
                >
                  {t('llmSwitcher.reset')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
