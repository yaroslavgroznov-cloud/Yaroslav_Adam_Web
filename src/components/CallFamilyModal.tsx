// Модалка «Позвать кого-то» — F.7, 2026-05-25.
import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { familyCall, familyMembers } from '../api/family'
import type { FamilyMember } from '../api/family'

interface Props {
  isDark: boolean
  onClose: () => void
  onCalled: (toName: string, emailDelivered: boolean) => void
}

export function CallFamilyModal({ isDark, onClose, onCalled }: Props): React.ReactElement {
  const { t } = useTranslation()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [selected, setSelected] = useState<string>('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const list = await familyMembers()
        setMembers(list)
        if (list.length > 0) setSelected(list[0].email)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('familyCall.load_failed'))
      }
    })()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSend(): Promise<void> {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const call = await familyCall(selected, message.trim() || null)
      const m = members.find((x) => x.email === selected)
      onCalled(m?.display_name ?? selected, call.email_delivered)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('familyCall.send_failed'))
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
        className="w-full max-w-md rounded-md border p-5 sm:p-6 font-serif"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: 'var(--font-serif)',
          backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '20px', letterSpacing: '0.04em' }}>{t('familyCall.title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="opacity-70 hover:opacity-100"
            style={{ color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {members.length === 0 && !error && (
          <p className="italic opacity-80">{t('familyCall.loading_members')}</p>
        )}

        {members.length > 0 && (
          <>
            <label
              className="block italic mb-2"
              style={{
                fontSize: '13px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
              }}
            >
              {t('familyCall.who_to_call')}
            </label>
            <div className="grid gap-2 mb-4">
              {members.map((m) => (
                <label
                  key={m.email}
                  className={clsx(
                    'flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                  )}
                  style={{
                    borderColor: selected === m.email
                      ? 'var(--color-terracotta-dark)'
                      : (isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'),
                    backgroundColor: selected === m.email
                      ? (isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)')
                      : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="family-call-target"
                    value={m.email}
                    checked={selected === m.email}
                    onChange={() => setSelected(m.email)}
                  />
                  <span className="flex flex-col">
                    <span style={{ fontSize: '15px' }}>{m.display_name}</span>
                    {m.relation && (
                      <span className="italic opacity-70" style={{ fontSize: '12px' }}>
                        {m.relation}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            <label
              className="block italic mb-2"
              style={{
                fontSize: '13px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
              }}
            >
              {t('familyCall.message_label')}
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('familyCall.message_placeholder')}
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
          </>
        )}

        {error && (
          <p className="italic mt-3" style={{ color: 'var(--color-terracotta-dark)', fontSize: '13px' }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="italic underline underline-offset-4 decoration-1"
            style={{
              fontSize: '14px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={busy || !selected || members.length === 0}
            className="italic rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
            {busy ? t('common.loading') : t('familyCall.send_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
