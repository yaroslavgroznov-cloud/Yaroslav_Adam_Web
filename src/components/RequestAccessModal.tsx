// RequestAccessModal — F.70, 2026-06-05.
// Юзер кликнул «войти» в creator_grant кабинет → этот модал просит email
// и опц. сообщение. POST /cabinets/{slug}/request-access. На ответ — ack 72ч.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cabinetRequestAccess } from '../api/cabinets'
import { useDarkMode } from '../hooks/useDarkMode'

interface Props {
  cabinetSlug: string
  cabinetName: string
  initialEmail?: string
  onClose: () => void
}

export function RequestAccessModal({ cabinetSlug, cabinetName, initialEmail, onClose }: Props): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [email, setEmail] = useState(initialEmail ?? '')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('grant_request.invalid_email'))
      return
    }
    setSubmitting(true)
    try {
      const r = await cabinetRequestAccess(cabinetSlug, trimmed, message.trim() || undefined)
      setDone(r.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('grant_request.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const accent = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)'
  const border = isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="font-serif"
        style={{
          backgroundColor: bg, color: fg,
          fontFamily: 'var(--font-serif)',
          border: `1px solid ${border}`,
          borderRadius: '6px',
          padding: '28px',
          maxWidth: '480px', width: '100%',
        }}
      >
        <p
          className="italic mb-2 opacity-60"
          style={{ fontSize: '12px', letterSpacing: '0.35em', textTransform: 'uppercase' }}
        >
          {t('grant_request.eyebrow')}
        </p>
        <h2 className="italic mb-4" style={{ fontSize: '20px', letterSpacing: '0.04em' }}>
          {cabinetName}
        </h2>

        {done ? (
          <>
            <p className="italic mb-6" style={{ fontSize: '15px', lineHeight: 1.6 }}>
              {done}
            </p>
            <button
              onClick={onClose}
              className="italic"
              style={{
                padding: '10px 28px', fontSize: '14px',
                backgroundColor: accent,
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                border: 'none', borderRadius: '4px', letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t('grant_request.close')}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="italic mb-5 opacity-85" style={{ fontSize: '14px', lineHeight: 1.6 }}>
              {t('grant_request.intro')}
            </p>

            <label className="italic block mb-1" style={{ fontSize: '12px', opacity: 0.75 }}>
              {t('grant_request.email_label')}
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              style={{
                width: '100%', padding: '10px 12px', fontSize: '15px',
                background: 'transparent', color: 'inherit',
                border: `1px solid ${border}`, borderRadius: '4px',
                marginBottom: '16px', fontFamily: 'inherit',
              }}
            />

            <label className="italic block mb-1" style={{ fontSize: '12px', opacity: 0.75 }}>
              {t('grant_request.message_label')}
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              maxLength={2000}
              placeholder={t('grant_request.message_placeholder')}
              style={{
                width: '100%', padding: '10px 12px', fontSize: '14px',
                background: 'transparent', color: 'inherit',
                border: `1px solid ${border}`, borderRadius: '4px',
                marginBottom: '8px', resize: 'vertical', fontFamily: 'inherit',
              }}
            />

            <p className="italic mb-4 opacity-60" style={{ fontSize: '12px', lineHeight: 1.5 }}>
              {t('grant_request.sla_note')}
            </p>

            {error && (
              <p className="italic mb-3" style={{ color: 'var(--color-terracotta-dark)', fontSize: '13px' }}>
                {error}
              </p>
            )}

            <div className="flex justify-end" style={{ gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="italic underline underline-offset-4 decoration-1"
                style={{
                  background: 'transparent', border: 'none', color: 'inherit',
                  cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit',
                }}
              >
                {t('grant_request.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="italic"
                style={{
                  padding: '10px 28px', fontSize: '14px',
                  backgroundColor: accent,
                  color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  border: 'none', borderRadius: '4px', letterSpacing: '0.08em',
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? t('grant_request.submitting') : t('grant_request.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
