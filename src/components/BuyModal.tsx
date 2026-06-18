// BuyModal -- F.66.3 крипто-чекаут із PricingPage, 2026-06-18.
// Модалка, що відкривається при кліку на CTA тарифу. Показує:
//   1) Назву тарифу + ціну USD + орієнтовну ціну в локальній валюті
//   2) Кнопку "Отримати адрес для оплати" -> POST /payments/initiate
//      (provider=crypto_trc20). Бекенд повертає унікальну суму USDT +
//      гаманець TRC20 + payment_id (watcher матчить on-chain).
//   3) Кнопку copy + інструкції
//   4) Placeholder для карткової оплати ("Скоро - очікуємо верифікації
//      LiqPay/Paddle")
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
  // Identifier для аналітики й заголовка модалки.
  id: string
  // 'Сесія' / 'Тема' / 'All-Access' / 'X' / 'cabinet:<slug>' / etc.
  label: string
  // Підказка під заголовком ('одна сесія в будь-якому кабінеті', etc).
  hint?: string
  // Ціна в USD (для разової оплати - повна сума).
  amount_usd: number
  // Backend kind. Для тарифів Topic/All/X = 'subscription'.
  kind: BuyKind
  // Для cabinet_session обов'язково; для subscription/topup передавати slug
  // як ідентифікатор плану ('all_access' | 'x_tier' | 'topic' | 'session_topup').
  cabinet_slug?: string
}

interface BuyModalProps {
  target: BuyModalTarget
  open: boolean
  onClose: () => void
  isDark: boolean
}

interface CryptoInfo {
  wallet: string
  amount: string   // USDT з 6 знаками
  payment_id: number
}

export function BuyModal({ target, open, onClose, isDark }: BuyModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const { currency, formatLocal } = useCurrency()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  const [info, setInfo] = useState<CryptoInfo | null>(null)
  const [copied, setCopied] = useState<'wallet' | 'amount' | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Скидаємо стан при відкритті нового target
  useEffect(() => {
    if (open) {
      setBusy(false); setError(''); setAuthRequired(false); setInfo(null); setCopied(null)
    }
  }, [open, target.id])

  // ESC закриває; focus trap легкий (фокус на діалогу).
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

  const usdFmt = formatUsd(target.amount_usd)
  const localFmt = formatLocal(target.amount_usd)

  async function requestAddress(): Promise<void> {
    setBusy(true); setError(''); setAuthRequired(false); setInfo(null)
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
        setError(na.message || t('buy_modal.crypto_unavailable'))
      } else if (na?.wallet && na.amount_usd != null && na.payment_id != null) {
        setInfo({
          wallet: na.wallet,
          amount: na.amount_usd.toFixed(6),
          payment_id: na.payment_id,
        })
      } else {
        setError(t('buy_modal.crypto_unavailable'))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      if (msg.includes('401') || msg.includes('403') || /unauth/i.test(msg)) {
        setAuthRequired(true)
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  async function copyText(text: string, what: 'wallet' | 'amount'): Promise<void> {
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          padding: '28px 32px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
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
          {target.label}
        </h2>
        {target.hint && (
          <p className="italic opacity-75 mb-4" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            {target.hint}
          </p>
        )}

        <div className="mb-5">
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

        {/* Спосіб 1 - крипта */}
        <div
          className="rounded-md p-4 mb-3"
          style={{ border: `1px solid ${cardBorder}`, backgroundColor: 'rgba(0,0,0,0.025)' }}
        >
          <p className="italic mb-2" style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
            {t('buy_modal.method_crypto_title')}
          </p>
          <p className="italic opacity-70 mb-3" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            {t('buy_modal.method_crypto_hint')}
          </p>

          {!info && !authRequired && (
            <button
              onClick={() => void requestAddress()}
              disabled={busy}
              className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                backgroundColor: accent,
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                border: `1px solid ${accent}`,
                borderRadius: '6px',
                letterSpacing: '0.08em',
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? t('buy_modal.requesting') : t('buy_modal.request_address')}
            </button>
          )}

          {authRequired && (
            <div>
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

          {info && (
            <div style={{ fontSize: '13px' }}>
              <p className="italic opacity-80 mb-3" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                {t('buy_modal.crypto_instructions')}
              </p>
              <div className="mb-2 flex items-baseline gap-2 flex-wrap">
                <span className="opacity-60" style={{ fontSize: '12px' }}>{t('buy_modal.crypto_amount')}:</span>
                <code style={{ fontSize: '15px', fontWeight: 600, wordBreak: 'break-all' }}>{info.amount} USDT</code>
                <button
                  onClick={() => void copyText(info.amount, 'amount')}
                  className="italic"
                  style={{
                    fontSize: '11px', background: 'transparent', border: '1px solid currentColor',
                    color: 'inherit', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  {copied === 'amount' ? t('buy_modal.copied') : t('buy_modal.copy')}
                </button>
              </div>
              <div className="mb-2 flex items-baseline gap-2 flex-wrap">
                <span className="opacity-60" style={{ fontSize: '12px' }}>{t('buy_modal.crypto_wallet')}:</span>
                <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{info.wallet}</code>
                <button
                  onClick={() => void copyText(info.wallet, 'wallet')}
                  className="italic"
                  style={{
                    fontSize: '11px', background: 'transparent', border: '1px solid currentColor',
                    color: 'inherit', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  {copied === 'wallet' ? t('buy_modal.copied') : t('buy_modal.copy')}
                </button>
              </div>
              <p className="italic opacity-65" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                {t('buy_modal.crypto_polling', { id: info.payment_id })}
              </p>
            </div>
          )}

          {error && (
            <p className="italic mt-3" style={{ fontSize: '12px', color: burgundy }}>
              {error}
            </p>
          )}
        </div>

        {/* Спосіб 2 - картки (заглушка) */}
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
