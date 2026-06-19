// BuyModal -- крипто-чекаут із PricingPage.
// F.66.3 (2026-06-18): спочатку TRC20 + card placeholder.
// F.66.4 (2026-06-19): + TON Pay (USDT-TON Jetton) — первий метод, оптимальний
// для Telegram-аудиторії (sub-second settlement, fee $0.0005, comment-based
// matching). Manual-mode перший etap пілота: юзер бачить наш recipient + amount
// + обов'язковий comment, відправляє з свого TON-гаманця (Telegram Wallet /
// Tonkeeper / Trust Wallet). TonConnectUI-режим — друга ітерація після smoke.
//
// КРИТИЧНО: усі попередження про сеть і comment мають бути видимими. Помилка
// сеті = безповоротна втрата коштів. Це наш юридичний і моральний обов'язок
// перед користувачем.
//
// AuthGate: /payments/initiate потребує CF Access cookie. Якщо гість не
// авторизований -> ловимо HTTP 401/403 і показуємо "Увійдіть, щоб
// продовжити" з посиланням на /chat (там CF Access OTP).
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { paymentInitiate } from '../api/cabinets'
import { useCurrency } from '../hooks/useCurrency'
import { formatUsd } from '../utils/currency'

export type BuyKind = 'topup' | 'subscription' | 'cabinet_session'

export interface BuyModalTarget {
  id: string
  label: string
  hint?: string
  amount_usd: number
  kind: BuyKind
  cabinet_slug?: string
}

interface BuyModalProps {
  target: BuyModalTarget
  open: boolean
  onClose: () => void
  isDark: boolean
}

interface TrcInfo {
  wallet: string
  amount: string   // USDT TRC20 з 6 знаками (unique)
  payment_id: number
}

interface TonInfo {
  recipient: string
  amount_usdt: string   // ціла сума, USDT-TON
  reference: string     // обов'язковий comment
  payment_id: number
}

export function BuyModal({ target, open, onClose, isDark }: BuyModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const { currency, formatLocal } = useCurrency()
  const [busyTrc, setBusyTrc] = useState(false)
  const [busyTon, setBusyTon] = useState(false)
  const [errorTrc, setErrorTrc] = useState('')
  const [errorTon, setErrorTon] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  const [trcInfo, setTrcInfo] = useState<TrcInfo | null>(null)
  const [tonInfo, setTonInfo] = useState<TonInfo | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      setBusyTrc(false); setBusyTon(false)
      setErrorTrc(''); setErrorTon('')
      setAuthRequired(false)
      setTrcInfo(null); setTonInfo(null)
      setCopied(null)
    }
  }, [open, target.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const accent = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)'
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'
  const warnBorder = isDark ? 'rgba(220,80,60,0.55)' : 'rgba(170,40,40,0.55)'
  const warnBg = isDark ? 'rgba(220,80,60,0.10)' : 'rgba(170,40,40,0.06)'

  const usdFmt = formatUsd(target.amount_usd)
  const localFmt = formatLocal(target.amount_usd)
  const isSongwriting = target.cabinet_slug === 'songwriting'

  function handleAuthError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : 'error'
    if (msg.includes('401') || msg.includes('403') || /unauth/i.test(msg)) {
      setAuthRequired(true)
      return true
    }
    return false
  }

  async function requestTrc(): Promise<void> {
    setBusyTrc(true); setErrorTrc(''); setAuthRequired(false); setTrcInfo(null)
    try {
      const res = await paymentInitiate({
        kind: target.kind,
        provider: 'crypto_trc20',
        amount_usd: target.amount_usd,
        cabinet_slug: target.cabinet_slug,
      })
      const na = res.next_action as {
        type?: string
        wallet?: string
        amount_usd?: number
        payment_id?: number
        message?: string
      } | null
      if (na?.type === 'not_configured') {
        setErrorTrc(na.message || t('buy_modal.crypto_unavailable'))
      } else if (na?.wallet && na.amount_usd != null && na.payment_id != null) {
        setTrcInfo({
          wallet: na.wallet,
          amount: na.amount_usd.toFixed(6),
          payment_id: na.payment_id,
        })
      } else {
        setErrorTrc(t('buy_modal.crypto_unavailable'))
      }
    } catch (e) {
      if (!handleAuthError(e)) {
        setErrorTrc(e instanceof Error ? e.message : 'error')
      }
    } finally {
      setBusyTrc(false)
    }
  }

  async function requestTon(): Promise<void> {
    setBusyTon(true); setErrorTon(''); setAuthRequired(false); setTonInfo(null)
    try {
      const res = await paymentInitiate({
        kind: target.kind,
        provider: 'ton_pay',
        amount_usd: target.amount_usd,
        cabinet_slug: target.cabinet_slug,
      })
      const na = res.next_action as {
        type?: string
        recipient?: string
        amount_usdt?: number
        reference?: string
        payment_id?: number
        message?: string
      } | null
      if (na?.type === 'not_configured') {
        setErrorTon(na.message || t('buy_modal.ton_unavailable'))
      } else if (na?.recipient && na.amount_usdt != null && na.reference && na.payment_id != null) {
        setTonInfo({
          recipient: na.recipient,
          amount_usdt: na.amount_usdt.toFixed(2),
          reference: na.reference,
          payment_id: na.payment_id,
        })
      } else {
        setErrorTon(t('buy_modal.ton_unavailable'))
      }
    } catch (e) {
      if (!handleAuthError(e)) {
        setErrorTon(e instanceof Error ? e.message : 'error')
      }
    } finally {
      setBusyTon(false)
    }
  }

  async function copyText(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="font-serif"
        style={{
          fontFamily: 'var(--font-serif)',
          backgroundColor: bg,
          color: fg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '8px',
          padding: '24px 28px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="italic opacity-65" style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            {t('buy_modal.eyebrow')}
          </p>
          <button
            onClick={onClose}
            aria-label={t('buy_modal.close')}
            style={{
              background: 'transparent', border: 'none', color: 'inherit',
              fontSize: '18px', cursor: 'pointer', padding: '4px 8px', opacity: 0.7,
            }}
          >
            ✕
          </button>
        </div>

        <h2
          id="buy-modal-title"
          className="italic mb-1"
          style={{ fontSize: '22px', letterSpacing: '0.03em', color: burgundy }}
        >
          {isSongwriting ? t('buy_modal.songwriting_title') : target.label}
        </h2>
        {target.hint && (
          <p className="italic opacity-75 mb-3" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            {isSongwriting ? t('buy_modal.songwriting_hint') : target.hint}
          </p>
        )}

        <div className="mb-4">
          <div style={{ fontSize: '26px', letterSpacing: '0.02em' }}>{usdFmt}</div>
          {localFmt && (
            <div className="opacity-65" style={{ fontSize: '13px' }}>{localFmt}</div>
          )}
          {currency && currency !== 'USD' && (
            <p className="italic opacity-55 mt-1" style={{ fontSize: '11px', lineHeight: 1.4 }}>
              {t('buy_modal.rate_note')}
            </p>
          )}
        </div>

        {/* GLOBAL WARNING — критичне попередження про вибір методу й сеті */}
        <div
          className="rounded-md p-3 mb-4"
          style={{ border: `1px solid ${warnBorder}`, backgroundColor: warnBg }}
        >
          <p className="italic mb-1" style={{ fontSize: '12px', fontWeight: 600, color: burgundy }}>
            ⚠ {t('buy_modal.global_warning_title')}
          </p>
          <p className="italic opacity-90" style={{ fontSize: '12px', lineHeight: 1.55 }}>
            {t('buy_modal.global_warning_body')}
          </p>
        </div>

        {/* AUTH-required state — показуємо ОДИН раз для будь-якого методу */}
        {authRequired && (
          <div
            className="rounded-md p-3 mb-3"
            style={{ border: `1px solid ${cardBorder}` }}
          >
            <p className="italic mb-2" style={{ fontSize: '12px' }}>
              {t('buy_modal.login_required')}
            </p>
            <a
              href={`/chat?return=${encodeURIComponent('/pricing')}`}
              className="italic"
              style={{
                display: 'inline-block',
                padding: '8px 18px',
                fontSize: '13px',
                backgroundColor: accent,
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                border: `1px solid ${accent}`,
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              {t('buy_modal.login_cta')}
            </a>
          </div>
        )}

        {/* МЕТОД 1 — TON Pay (USDT-TON Jetton, Telegram-native) */}
        <div
          className="rounded-md p-4 mb-3"
          style={{ border: `1px solid ${cardBorder}`, backgroundColor: 'rgba(0,0,0,0.025)' }}
        >
          <div className="flex items-baseline justify-between mb-1">
            <p className="italic" style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
              {t('buy_modal.method_ton_title')}
            </p>
            <span className="italic opacity-65" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>
              {t('buy_modal.recommended')}
            </span>
          </div>
          <p className="italic opacity-70 mb-2" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            {t('buy_modal.method_ton_hint')}
          </p>
          <p className="italic mb-3" style={{ fontSize: '11px', lineHeight: 1.5, color: burgundy }}>
            ⚠ {t('buy_modal.ton_warning')}
          </p>

          {!tonInfo && !authRequired && (
            <button
              onClick={() => void requestTon()}
              disabled={busyTon}
              className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                backgroundColor: accent,
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                border: `1px solid ${accent}`,
                borderRadius: '6px',
                letterSpacing: '0.08em',
                cursor: busyTon ? 'wait' : 'pointer',
                opacity: busyTon ? 0.65 : 1,
              }}
            >
              {busyTon ? t('buy_modal.requesting') : t('buy_modal.ton_request')}
            </button>
          )}

          {tonInfo && (
            <div style={{ fontSize: '13px' }}>
              <p className="italic opacity-80 mb-3" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                {t('buy_modal.ton_instructions')}
              </p>
              <CopyRow
                labelKey="buy_modal.ton_amount"
                value={`${tonInfo.amount_usdt} USDT-TON`}
                copyValue={tonInfo.amount_usdt}
                what="ton_amount"
                copied={copied}
                onCopy={copyText}
                t={t}
                emphasis
              />
              <CopyRow
                labelKey="buy_modal.ton_recipient"
                value={tonInfo.recipient}
                copyValue={tonInfo.recipient}
                what="ton_recipient"
                copied={copied}
                onCopy={copyText}
                t={t}
              />
              <CopyRow
                labelKey="buy_modal.ton_comment"
                value={tonInfo.reference}
                copyValue={tonInfo.reference}
                what="ton_comment"
                copied={copied}
                onCopy={copyText}
                t={t}
                emphasis
              />
              <p className="italic mt-2" style={{ fontSize: '11px', lineHeight: 1.5, color: burgundy }}>
                ⚠ {t('buy_modal.ton_comment_critical')}
              </p>
              <p className="italic opacity-65 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                {t('buy_modal.ton_polling', { id: tonInfo.payment_id })}
              </p>
            </div>
          )}

          {errorTon && (
            <p className="italic mt-3" style={{ fontSize: '12px', color: burgundy }}>
              {errorTon}
            </p>
          )}
        </div>

        {/* МЕТОД 2 — USDT TRC20 (legacy, для не-Telegram криптоюзерів) */}
        <div
          className="rounded-md p-4 mb-3"
          style={{ border: `1px solid ${cardBorder}`, backgroundColor: 'rgba(0,0,0,0.025)' }}
        >
          <p className="italic mb-1" style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
            {t('buy_modal.method_crypto_title')}
          </p>
          <p className="italic opacity-70 mb-2" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            {t('buy_modal.method_crypto_hint')}
          </p>
          <p className="italic mb-3" style={{ fontSize: '11px', lineHeight: 1.5, color: burgundy }}>
            ⚠ {t('buy_modal.trc20_warning')}
          </p>

          {!trcInfo && !authRequired && (
            <button
              onClick={() => void requestTrc()}
              disabled={busyTrc}
              className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                backgroundColor: 'transparent',
                color: 'inherit',
                border: `1px solid ${accent}`,
                borderRadius: '6px',
                letterSpacing: '0.08em',
                cursor: busyTrc ? 'wait' : 'pointer',
                opacity: busyTrc ? 0.65 : 1,
              }}
            >
              {busyTrc ? t('buy_modal.requesting') : t('buy_modal.request_address')}
            </button>
          )}

          {trcInfo && (
            <div style={{ fontSize: '13px' }}>
              <p className="italic opacity-80 mb-3" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                {t('buy_modal.crypto_instructions')}
              </p>
              <CopyRow
                labelKey="buy_modal.crypto_amount"
                value={`${trcInfo.amount} USDT`}
                copyValue={trcInfo.amount}
                what="trc_amount"
                copied={copied}
                onCopy={copyText}
                t={t}
                emphasis
              />
              <CopyRow
                labelKey="buy_modal.crypto_wallet"
                value={trcInfo.wallet}
                copyValue={trcInfo.wallet}
                what="trc_wallet"
                copied={copied}
                onCopy={copyText}
                t={t}
              />
              <p className="italic mt-2" style={{ fontSize: '11px', lineHeight: 1.5, color: burgundy }}>
                ⚠ {t('buy_modal.trc20_amount_critical')}
              </p>
              <p className="italic opacity-65 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                {t('buy_modal.crypto_polling', { id: trcInfo.payment_id })}
              </p>
            </div>
          )}

          {errorTrc && (
            <p className="italic mt-3" style={{ fontSize: '12px', color: burgundy }}>
              {errorTrc}
            </p>
          )}
        </div>

        {/* МЕТОД 3 — картки (заглушка) */}
        <div
          className="rounded-md p-4"
          style={{ border: `1px dashed ${cardBorder}`, opacity: 0.7 }}
        >
          <p className="italic mb-1" style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
            {t('buy_modal.method_card_title')}
          </p>
          <p className="italic opacity-75" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            {t('buy_modal.method_card_soon')}
          </p>
        </div>

        {/* Songwriting: after payment info shown, link to /songs/new */}
        {isSongwriting && (tonInfo !== null || trcInfo !== null) && (
          <div className="rounded-md p-3 mt-3 text-center" style={{ border: `1px solid ${cardBorder}` }}>
            <p className="italic mb-2" style={{ fontSize: '12px', lineHeight: 1.5 }}>
              {t('buy_modal.songwriting_after_pay_hint')}
            </p>
            <a
              href="/songs/new"
              className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
              style={{
                display: 'inline-block',
                padding: '8px 18px',
                fontSize: '13px',
                backgroundColor: burgundy,
                color: 'var(--color-parchment)',
                border: `1px solid ${burgundy}`,
                borderRadius: '6px',
                textDecoration: 'none',
                letterSpacing: '0.06em',
              }}
            >
              {t('buy_modal.songwriting_cta_new')}
            </a>
          </div>
        )}

        {/* Footer — refund link */}
        <p className="italic opacity-55 mt-4 text-center" style={{ fontSize: '11px', lineHeight: 1.5 }}>
          <a
            href="/refund"
            style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            {t('buy_modal.refund_link')}
          </a>
        </p>
      </div>
    </div>
  )
}

// ---------- Helpers ----------

interface CopyRowProps {
  labelKey: string
  value: string
  copyValue: string
  what: string
  copied: string | null
  onCopy: (text: string, what: string) => Promise<void>
  t: (key: string) => string
  emphasis?: boolean
}

function CopyRow(p: CopyRowProps): React.ReactElement {
  return (
    <div className="mb-2 flex items-baseline gap-2 flex-wrap">
      <span className="opacity-60" style={{ fontSize: '12px' }}>
        {p.t(p.labelKey)}:
      </span>
      <code
        style={{
          fontSize: p.emphasis ? '15px' : '12px',
          fontWeight: p.emphasis ? 600 : 400,
          wordBreak: 'break-all',
        }}
      >
        {p.value}
      </code>
      <button
        onClick={() => void p.onCopy(p.copyValue, p.what)}
        className="italic"
        style={{
          fontSize: '11px',
          background: 'transparent',
          border: '1px solid currentColor',
          color: 'inherit',
          borderRadius: '4px',
          padding: '2px 8px',
          cursor: 'pointer',
        }}
      >
        {p.copied === p.what ? p.t('buy_modal.copied') : p.t('buy_modal.copy')}
      </button>
    </div>
  )
}
