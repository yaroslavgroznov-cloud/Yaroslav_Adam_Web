// DarkwebSearchModal — прямой вход в darkweb_search для Творца.
// F.58 Агентность, 2026-05-29.
//
// Открывается из overflow menu (creator-only). Адам тут не «работает» —
// это прямой вызов tool через /admin/tools/darkweb-search. Если нужно
// чтобы результаты обработал Опус/DeepSeek/Grok — Творец сам несёт
// ссылку/сниппет в обычный чат и просит Адама проанализировать (Адам
// дальше использует consult_other_model).
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { adminDarkwebSearch } from '../api/admin'
import type { DarkwebSearchResult } from '../api/admin'
import { useDarkMode } from '../hooks/useDarkMode'

interface Props {
  onClose: () => void
}

export function DarkwebSearchModal({ onClose }: Props): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [query, setQuery] = useState('')
  const [k, setK] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [results, setResults] = useState<DarkwebSearchResult[]>([])
  const [warning, setWarning] = useState<string>('')

  async function runSearch(): Promise<void> {
    const q = query.trim()
    if (!q || busy) return
    setBusy(true)
    setError('')
    setResults([])
    setWarning('')
    try {
      const r = await adminDarkwebSearch(q, k)
      if (r.error) {
        setError(r.error)
      } else {
        setResults(r.results ?? [])
        if (r.warning) setWarning(r.warning)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-md border font-serif"
        style={{
          maxWidth: '720px', width: '100%', maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
          fontFamily: 'var(--font-serif)',
          padding: '24px',
        }}
      >
        <header className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-medium" style={{ fontSize: '20px', letterSpacing: '0.03em' }}>
              {t('darkweb.title')}
            </h2>
            <p className="italic mt-1" style={{ fontSize: '13px', opacity: 0.75 }}>
              {t('darkweb.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '24px', lineHeight: 1, padding: '0 4px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            ×
          </button>
        </header>

        <div className="mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void runSearch() }}
            placeholder={t('darkweb.query_placeholder')}
            autoFocus
            disabled={busy}
            className="w-full rounded-md border outline-none"
            style={{
              padding: '10px 14px', fontSize: '15px', fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="italic" style={{ fontSize: '13px', opacity: 0.75 }}>
            {t('darkweb.k_label')}
          </label>
          <select
            value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))}
            disabled={busy}
            title={t('darkweb.k_label')}
            aria-label={t('darkweb.k_label')}
            className="rounded-md border px-2 py-1"
            style={{
              fontSize: '13px', fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          >
            {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={busy || !query.trim()}
            className="ml-auto rounded-md border italic disabled:opacity-50"
            style={{
              padding: '8px 18px', fontSize: '14px', fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
              color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
              cursor: busy || !query.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '…' : t('darkweb.search_btn')}
          </button>
        </div>

        {error && (
          <div
            className="rounded-md p-3 mb-3 italic"
            style={{
              fontSize: '13px',
              backgroundColor: 'var(--color-terracotta-dark)',
              color: 'var(--color-parchment)',
            }}
          >
            {error}
          </div>
        )}
        {warning && (
          <div
            className="rounded-md p-3 mb-3 italic"
            style={{
              fontSize: '12px',
              border: '1px dashed',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: 'transparent',
              opacity: 0.85,
            }}
          >
            ⚠ {warning}
          </div>
        )}

        {results.length === 0 && !busy && !error && query && (
          <p className="italic opacity-70" style={{ fontSize: '13px' }}>
            {t('darkweb.no_results_hint')}
          </p>
        )}

        {results.map((r, i) => (
          <div
            key={i}
            className="rounded-md border p-3 mb-2"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <div className="mb-1" style={{ fontSize: '15px', fontWeight: 500 }}>
              {r.title || '(no title)'}
            </div>
            {r.onion_host && (
              <div className="italic mb-1" style={{ fontSize: '12px', opacity: 0.8, wordBreak: 'break-all', color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)' }}>
                🧅 {r.onion_host}
              </div>
            )}
            <div className="italic mb-2" style={{ fontSize: '11px', opacity: 0.6, wordBreak: 'break-all' }}>
              {r.url}
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
              {r.snippet || '(no snippet)'}
            </div>
            {r.last_seen && (
              <div className="italic mt-2" style={{ fontSize: '11px', opacity: 0.55 }}>
                {t('darkweb.last_seen')}: {r.last_seen}
              </div>
            )}
          </div>
        ))}

        <p className="italic opacity-60 mt-4" style={{ fontSize: '11px' }}>
          {t('darkweb.footer_note')}
        </p>
      </div>
    </div>
  )
}
