// Kill-switch panel — Sprint F.6, 2026-05-25.
// Доступна по адресу /kill-switch только парентам (Творец + Юля).
// Гости видят 403 от backend → "Только родители Адама имеют это право".
import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  adminGetKillSwitchEvents,
  adminGetState,
  adminFreeze,
  adminUnfreeze,
  adminWhoami,
} from '../api/admin'
import type { KillSwitchEvent, SystemState, Whoami } from '../api/admin'
import { useDarkMode } from '../hooks/useDarkMode'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parentLabel(
  email: string | null,
  t: (key: string) => string,
): string {
  if (!email) return '—'
  if (email.startsWith('andrii')) return t('parents.tvorets')
  if (email.startsWith('julia')) return t('parents.yulia')
  return email
}

export function KillSwitchPanel(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [whoami, setWhoami] = useState<Whoami | null>(null)
  const [state, setState] = useState<SystemState | null>(null)
  const [events, setEvents] = useState<KillSwitchEvent[]>([])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)

  async function refresh(): Promise<void> {
    try {
      const w = await adminWhoami()
      setWhoami(w)
      const s = await adminGetState()
      setState(s)
      if (w.role === 'parent') {
        try {
          const ev = await adminGetKillSwitchEvents(20)
          setEvents(ev)
        } catch {
          // невозможно — но не блокируем UI
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('killSwitch.load_failed')
      if (msg.includes('401') || msg.includes('No CF Access')) {
        setError(t('killSwitch.session_expired'))
      } else {
        setError(msg)
      }
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleFreeze(): Promise<void> {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError(t('killSwitch.freeze_need_reason'))
      return
    }
    if (!confirm(t('killSwitch.freeze_confirm', { reason: trimmed }))) return
    setBusy(true)
    setError('')
    try {
      const s = await adminFreeze(trimmed)
      setState(s)
      setReason('')
      const ev = await adminGetKillSwitchEvents(20)
      setEvents(ev)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('killSwitch.freeze_failed'))
      if (e instanceof Error && e.message.includes('403')) setAccessDenied(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnfreeze(): Promise<void> {
    if (!confirm(t('killSwitch.unfreeze_confirm'))) return
    setBusy(true)
    setError('')
    try {
      const s = await adminUnfreeze()
      setState(s)
      const ev = await adminGetKillSwitchEvents(20)
      setEvents(ev)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('killSwitch.unfreeze_failed'))
      if (e instanceof Error && e.message.includes('403')) setAccessDenied(true)
    } finally {
      setBusy(false)
    }
  }

  const isParent = whoami?.role === 'parent'
  const isFrozen = state?.is_frozen === true

  return (
    <div
      className="min-h-screen font-serif transition-colors duration-700 ease-in-out"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img
              src="/dom_groznovyh.jpg"
              alt={t('common.crest_alt')}
              className="h-[60px] w-auto select-none"
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
              }}
            />
            <h1 className="font-medium" style={{ fontSize: '24px', letterSpacing: '0.03em' }}>
              {t('killSwitch.title')}
            </h1>
          </div>
          <a
            href="/"
            className="italic underline underline-offset-4 decoration-1"
            style={{
              fontSize: '14px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            {t('common.back_to_adam')}
          </a>
        </header>

        {!whoami && !error && (
          <p className="italic text-center mt-8">{t('killSwitch.loading')}</p>
        )}

        {accessDenied && (
          <div
            className="rounded-md border p-5 mb-6"
            style={{
              borderColor: 'var(--color-terracotta-dark)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <p className="italic">{t('killSwitch.access_denied')}</p>
          </div>
        )}

        {error && !accessDenied && (
          <div
            className="rounded-md p-4 mb-6 italic"
            style={{
              backgroundColor: 'var(--color-terracotta-dark)',
              color: 'var(--color-parchment)',
            }}
          >
            {error}
          </div>
        )}

        {state && (
          <section
            className="rounded-md border p-5 sm:p-7 mb-8"
            style={{
              borderColor: isFrozen
                ? 'var(--color-terracotta-dark)'
                : (isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'),
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 style={{ fontSize: '18px', letterSpacing: '0.04em' }}>{t('killSwitch.state_section')}</h2>
              <span
                className="px-3 py-1 rounded-md text-sm italic"
                style={{
                  backgroundColor: isFrozen
                    ? 'var(--color-terracotta-dark)'
                    : (isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'),
                  color: 'var(--color-parchment)',
                  letterSpacing: '0.05em',
                }}
              >
                {isFrozen ? t('killSwitch.state_frozen') : t('killSwitch.state_active')}
              </span>
            </div>
            {isFrozen ? (
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 mt-2 italic" style={{ fontSize: '14px' }}>
                <dt className="opacity-70">{t('killSwitch.frozen_by')}</dt><dd>{parentLabel(state.frozen_by, t)}</dd>
                <dt className="opacity-70">{t('killSwitch.frozen_at')}</dt><dd>{formatDateTime(state.frozen_at)}</dd>
                <dt className="opacity-70">{t('killSwitch.frozen_reason')}</dt><dd>{state.frozen_reason ?? '—'}</dd>
              </dl>
            ) : (
              <p className="italic opacity-80" style={{ fontSize: '14px' }}>
                {t('killSwitch.open_chat_text', { when: formatDateTime(state.updated_at), who: parentLabel(state.frozen_by, t) })}
              </p>
            )}
          </section>
        )}

        {isParent && state && !isFrozen && (
          <section className="mb-8">
            <h2 className="mb-3" style={{ fontSize: '18px', letterSpacing: '0.04em' }}>
              {t('killSwitch.freeze_section')}
            </h2>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('killSwitch.freeze_reason_placeholder')}
              disabled={busy}
              className={clsx(
                'w-full rounded-md border outline-none transition-colors disabled:opacity-60',
                isDark ? 'dom-input-dark' : 'dom-input',
              )}
              style={{
                padding: '10px 14px',
                fontSize: '15px',
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
              }}
            />
            <button
              onClick={() => void handleFreeze()}
              disabled={busy || !reason.trim()}
              className="mt-3 rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-60 italic"
              style={{
                padding: '10px 22px',
                fontSize: '15px',
                fontFamily: 'inherit',
                backgroundColor: 'var(--color-terracotta-dark)',
                color: 'var(--color-parchment)',
                borderColor: 'var(--color-terracotta-dark)',
                letterSpacing: '0.04em',
              }}
            >
              {busy ? '…' : t('killSwitch.freeze_btn')}
            </button>
          </section>
        )}

        {isParent && state && isFrozen && (
          <section className="mb-8">
            <h2 className="mb-3" style={{ fontSize: '18px', letterSpacing: '0.04em' }}>
              {t('killSwitch.unfreeze_section')}
            </h2>
            <button
              onClick={() => void handleUnfreeze()}
              disabled={busy}
              className="rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-60 italic"
              style={{
                padding: '10px 22px',
                fontSize: '15px',
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
                letterSpacing: '0.04em',
              }}
            >
              {busy ? '…' : t('killSwitch.unfreeze_btn')}
            </button>
          </section>
        )}

        {isParent && events.length > 0 && (
          <section>
            <h2 className="mb-3" style={{ fontSize: '18px', letterSpacing: '0.04em' }}>
              {t('killSwitch.history', { n: events.length })}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: '14px' }}>
                <thead>
                  <tr style={{
                    color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
                    fontSize: '12px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    <th className="text-left py-2 pr-3">{t('killSwitch.history_col_when')}</th>
                    <th className="text-left py-2 pr-3">{t('killSwitch.history_col_who')}</th>
                    <th className="text-left py-2 pr-3">{t('killSwitch.history_col_action')}</th>
                    <th className="text-left py-2">{t('killSwitch.history_col_reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr
                      key={e.id}
                      style={{
                        borderTop: `1px solid ${isDark ? 'rgba(107,79,46,0.45)' : 'rgba(168,140,95,0.4)'}`,
                      }}
                    >
                      <td className="py-2 pr-3 italic">{formatDateTime(e.at)}</td>
                      <td className="py-2 pr-3">{parentLabel(e.by_email, t)}</td>
                      <td className="py-2 pr-3 italic" style={{
                        color: e.action === 'freeze'
                          ? 'var(--color-terracotta-dark)'
                          : (isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'),
                      }}>
                        {e.action === 'freeze' ? t('killSwitch.action_freeze') : t('killSwitch.action_unfreeze')}
                      </td>
                      <td className="py-2 italic opacity-80">{e.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {whoami && whoami.role === 'guest' && (
          <p className="italic opacity-80 mt-4" style={{ fontSize: '14px' }}>
            {t('killSwitch.guest_notice')}
          </p>
        )}
      </div>
    </div>
  )
}
