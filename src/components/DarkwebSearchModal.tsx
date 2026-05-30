// DarkwebSearchModal — прямой поисковый модал для Творца (F.58).
// Два источника на табах:
//   • Ahmia — TOR + .onion индекс (бесплатно, без ключа)
//   • Intel X — глубокие утечки + darknet + pastes (платный API, ключ в .env)
// Адам тут не задействован — это «панель разведки».
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { adminDarkwebSearch, adminIntelxSearch, adminPwnedCheck } from '../api/admin'
import type { DarkwebSearchResult, IntelxResult, PwnedBreach } from '../api/admin'
import { useDarkMode } from '../hooks/useDarkMode'

interface Props {
  onClose: () => void
}

type SourceTab = 'ahmia' | 'intelx' | 'pwned'

export function DarkwebSearchModal({ onClose }: Props): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()

  const [tab, setTab] = useState<SourceTab>('ahmia')
  const [query, setQuery] = useState('')
  const [k, setK] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [warning, setWarning] = useState<string>('')
  const [ahmiaResults, setAhmiaResults] = useState<DarkwebSearchResult[]>([])
  const [intelxResults, setIntelxResults] = useState<IntelxResult[]>([])
  const [intelxSoftWarn, setIntelxSoftWarn] = useState<string | null>(null)
  const [pwnedResults, setPwnedResults] = useState<PwnedBreach[]>([])
  const [pwnedNote, setPwnedNote] = useState<string | null>(null)
  const [pwnedFound, setPwnedFound] = useState<boolean | null>(null)

  async function runSearch(): Promise<void> {
    const q = query.trim()
    if (!q || busy) return
    setBusy(true)
    setError('')
    setWarning('')
    setIntelxSoftWarn(null)
    setAhmiaResults([])
    setIntelxResults([])
    setPwnedResults([])
    setPwnedNote(null)
    setPwnedFound(null)
    try {
      if (tab === 'ahmia') {
        const r = await adminDarkwebSearch(q, k)
        if (r.error) setError(r.error)
        else {
          setAhmiaResults(r.results ?? [])
          if (r.warning) setWarning(r.warning)
        }
      } else if (tab === 'intelx') {
        const r = await adminIntelxSearch(q, k)
        if (r.error) setError(r.error)
        else {
          setIntelxResults(r.results ?? [])
          if (r.note) setIntelxSoftWarn(r.note)
        }
      } else {
        // pwned
        const r = await adminPwnedCheck(q, false)
        if (r.error) setError(r.error)
        else {
          setPwnedResults(r.breaches ?? [])
          setPwnedFound(r.found ?? false)
          if (r.note) setPwnedNote(r.note)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const tabBtn = (target: SourceTab, label: string) => (
    <button
      type="button"
      onClick={() => { setTab(target); setError(''); setWarning(''); setIntelxSoftWarn(null) }}
      className="italic"
      style={{
        flex: 1, padding: '8px 12px', fontSize: '14px',
        background: 'transparent', border: 'none',
        borderBottom: tab === target ? '2px solid' : '2px solid transparent',
        borderColor: tab === target
          ? (isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)')
          : 'transparent',
        color: tab === target
          ? (isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)')
          : (isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)'),
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: tab === target ? 500 : 400,
      }}
    >
      {label}
    </button>
  )

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
          maxWidth: '760px', width: '100%', maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
          fontFamily: 'var(--font-serif)',
          padding: '24px',
        }}
      >
        <header className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-medium" style={{ fontSize: '20px', letterSpacing: '0.03em' }}>
              {t('darkweb.title_v2')}
            </h2>
            <p className="italic mt-1" style={{ fontSize: '13px', opacity: 0.75 }}>
              {t('darkweb.subtitle_v2')}
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

        {/* Табы */}
        <div
          className="flex mb-4"
          style={{ borderBottom: '1px solid', borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}
        >
          {tabBtn('ahmia', t('darkweb.tab_ahmia'))}
          {tabBtn('intelx', t('darkweb.tab_intelx'))}
          {tabBtn('pwned', t('darkweb.tab_pwned'))}
        </div>

        {/* Подсказка по табу */}
        <p className="italic mb-3" style={{ fontSize: '12px', opacity: 0.7 }}>
          {tab === 'ahmia'
            ? t('darkweb.hint_ahmia')
            : tab === 'intelx'
              ? t('darkweb.hint_intelx')
              : t('darkweb.hint_pwned')}
        </p>

        <div className="mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void runSearch() }}
            placeholder={
              tab === 'ahmia'
                ? t('darkweb.query_placeholder')
                : tab === 'intelx'
                  ? t('darkweb.intelx_placeholder')
                  : t('darkweb.pwned_placeholder')
            }
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
          {tab !== 'pwned' && (
            <>
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
                {(tab === 'ahmia' ? [3, 5, 7, 10] : [5, 10, 15, 25]).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </>
          )}
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
        {intelxSoftWarn && (
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
            ⚠ {intelxSoftWarn}
          </div>
        )}

        {/* Ahmia results */}
        {tab === 'ahmia' && ahmiaResults.length === 0 && !busy && !error && query && (
          <p className="italic opacity-70" style={{ fontSize: '13px' }}>
            {t('darkweb.no_results_hint')}
          </p>
        )}
        {tab === 'ahmia' && ahmiaResults.map((r, i) => (
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

        {/* Intelx results */}
        {tab === 'intelx' && intelxResults.length === 0 && !busy && !error && query && (
          <p className="italic opacity-70" style={{ fontSize: '13px' }}>
            {t('darkweb.no_results_hint')}
          </p>
        )}
        {tab === 'intelx' && intelxResults.map((r, i) => (
          <div
            key={i}
            className="rounded-md border p-3 mb-2"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <div className="mb-1" style={{ fontSize: '14px', fontWeight: 500, wordBreak: 'break-all' }}>
              {r.name || '(no name)'}
            </div>
            <div className="flex flex-wrap gap-3 italic" style={{ fontSize: '11px', opacity: 0.75 }}>
              <span style={{ color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)' }}>
                {r.bucket_name}
              </span>
              <span>{r.media_name}</span>
              {r.date && <span>{r.date.slice(0, 10)}</span>}
              {r.size > 0 && <span>{(r.size / 1024).toFixed(1)} KB</span>}
            </div>
            {r.systemid && (
              <div className="italic mt-2" style={{ fontSize: '11px', opacity: 0.55, wordBreak: 'break-all' }}>
                {t('darkweb.intelx_sysid')}: <code>{r.systemid}</code>
              </div>
            )}
          </div>
        ))}

        {/* Pwned results */}
        {tab === 'pwned' && pwnedFound === false && !busy && !error && (
          <div
            className="rounded-md border p-4 mb-2 italic"
            style={{
              fontSize: '14px',
              borderColor: isDark ? 'var(--color-pergament-soft, var(--color-ochre))' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          >
            ✓ {pwnedNote || t('darkweb.pwned_clean')}
          </div>
        )}
        {tab === 'pwned' && pwnedFound === true && (
          <div
            className="rounded-md border p-3 mb-3 italic"
            style={{
              fontSize: '13px',
              borderColor: 'var(--color-terracotta-dark)',
              backgroundColor: isDark ? 'rgba(192,98,63,0.15)' : 'rgba(192,98,63,0.10)',
              color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
            }}
          >
            ⚠ {t('darkweb.pwned_found', { count: pwnedResults.length })}
          </div>
        )}
        {tab === 'pwned' && pwnedResults.map((b, i) => (
          <div
            key={i}
            className="rounded-md border p-3 mb-2"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div style={{ fontSize: '15px', fontWeight: 500 }}>
                {b.title || b.name}
                {b.is_sensitive && (
                  <span
                    className="italic ml-2"
                    style={{ fontSize: '11px', color: 'var(--color-terracotta-dark)' }}
                  >
                    · {t('darkweb.pwned_sensitive')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 italic mb-2" style={{ fontSize: '11px', opacity: 0.75 }}>
              {b.domain && (
                <span style={{ color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)' }}>
                  {b.domain}
                </span>
              )}
              {b.breach_date && <span>{t('darkweb.pwned_breach_date')}: {b.breach_date}</span>}
              {typeof b.pwn_count === 'number' && b.pwn_count > 0 && (
                <span>{t('darkweb.pwned_accounts')}: {b.pwn_count.toLocaleString()}</span>
              )}
              {b.is_verified ? (
                <span style={{ color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)' }}>
                  ✓ {t('darkweb.pwned_verified')}
                </span>
              ) : (
                <span>· {t('darkweb.pwned_unverified')}</span>
              )}
            </div>
            {b.data_classes && b.data_classes.length > 0 && (
              <div className="mb-2" style={{ fontSize: '12px' }}>
                <span className="italic" style={{ opacity: 0.75 }}>
                  {t('darkweb.pwned_data_classes')}:{' '}
                </span>
                <span>{b.data_classes.join(', ')}</span>
              </div>
            )}
            {b.description && (
              <div className="italic mt-2" style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.45 }}>
                {b.description}
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
