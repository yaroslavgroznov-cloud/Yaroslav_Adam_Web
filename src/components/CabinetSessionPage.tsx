// CabinetSessionPage — F.41 fix, 2026-05-28.
// Route /cabinets/{slug} — intake форма + чат внутри конкретного кабинета.
import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  cabinetsList, cabinetSessionCreate, cabinetChat,
  cabinetSessionGet, paymentInitiate,
} from '../api/cabinets'
import type { Cabinet, CabinetSession } from '../api/cabinets'
import { useDarkMode } from '../hooks/useDarkMode'

interface ChatLine { role: 'user' | 'assistant'; content: string }

function getSlugFromPath(): string {
  const m = window.location.pathname.match(/^\/cabinets\/([^/?#]+)/)
  return m ? m[1] : ''
}

export function CabinetSessionPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const slug = getSlugFromPath()
  const [cabinet, setCabinet] = useState<Cabinet | null>(null)
  const [session, setSession] = useState<CabinetSession | null>(null)
  const [intakeData, setIntakeData] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ChatLine[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cryptoInfo, setCryptoInfo] = useState<{wallet: string; amount: string; payment_id: number} | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const list = await cabinetsList()
        const found = list.find((c) => c.slug === slug) ?? null
        setCabinet(found)
        if (found && !found.is_active) {
          setError(t('cabinets.not_active_yet'))
        }
        // Post-redirect после Lemon checkout: ?session=<id>&payment=success
        const url = new URL(window.location.href)
        const sidStr = url.searchParams.get('session')
        const paymentFlag = url.searchParams.get('payment')
        if (sidStr) {
          try {
            const sid = parseInt(sidStr, 10)
            const s = await cabinetSessionGet(sid)
            setSession(s)
            if (paymentFlag === 'success' && s.payment_status === 'pending') {
              // Webhook ещё мог не успеть — поллим до 20 сек
              for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 2000))
                const s2 = await cabinetSessionGet(sid)
                if (s2.payment_status !== 'pending') { setSession(s2); break }
              }
            }
            // очистим query string
            window.history.replaceState({}, '', `/cabinets/${slug}`)
          } catch {/* ignore */}
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'error')
      }
    })()
  }, [slug, t])

  async function payLemon(mode: 'session' | 'subscription'): Promise<void> {
    if (!cabinet || !session) return
    setBusy(true); setError('')
    try {
      const amount = mode === 'subscription'
        ? (cabinet.price_usd_subscription_monthly ?? 0)
        : cabinet.price_usd_session
      const res = await paymentInitiate({
        kind: mode === 'subscription' ? 'subscription' : 'cabinet_session',
        provider: 'lemon_squeezy',
        amount_usd: amount,
        cabinet_session_id: session.id,
        cabinet_slug: cabinet.slug,
        mode,
      })
      const checkoutUrl = (res.next_action as { checkout_url?: string } | null)?.checkout_url
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        setError(t('cabinets.payment_init_failed'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  async function payCrypto(): Promise<void> {
    if (!cabinet || !session) return
    setBusy(true); setError('')
    try {
      const res = await paymentInitiate({
        kind: 'cabinet_session',
        provider: 'crypto_trc20',
        amount_usd: cabinet.price_usd_session,
        cabinet_session_id: session.id,
      })
      const na = res.next_action as { wallet?: string; amount_usd?: number; payment_id?: number } | null
      if (na?.wallet && na.amount_usd != null && na.payment_id != null) {
        setCryptoInfo({
          wallet: na.wallet,
          amount: na.amount_usd.toFixed(6),
          payment_id: na.payment_id,
        })
      } else {
        setError(t('cabinets.crypto_unavailable'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, busy])

  async function startSession(): Promise<void> {
    if (!cabinet) return
    setBusy(true)
    setError('')
    try {
      const s = await cabinetSessionCreate(cabinet.slug, intakeData)
      setSession(s)
      if (s.payment_status === 'pending') {
        setError(t('cabinets.payment_required', { price: cabinet.price_usd_session.toFixed(2) }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  async function send(): Promise<void> {
    if (!session || !input.trim() || busy) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setBusy(true)
    try {
      const r = await cabinetChat(session.id, userMsg)
      setMessages((prev) => [...prev, { role: 'assistant', content: r.reply }])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠ ${e instanceof Error ? e.message : 'error'}` },
      ])
    } finally {
      setBusy(false)
    }
  }

  if (!cabinet) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif italic"
           style={{ backgroundColor: 'var(--color-parchment)', color: 'var(--color-umber)' }}>
        {error || '…'}
      </div>
    )
  }

  const sessionActive = session !== null
    && (session.payment_status === 'free_family' || session.payment_status === 'paid')
  const fields = cabinet.intake_form?.fields ?? []

  return (
    <div
      className="min-h-screen font-serif"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-8">
        <header className="flex items-center justify-between mb-5">
          <div>
            <a
              href="/cabinets"
              className="italic underline underline-offset-4 decoration-1"
              style={{ fontSize: '13px', opacity: 0.7 }}
            >
              ← {t('cabinets.title')}
            </a>
            <h1 className="font-medium mt-1" style={{ fontSize: '22px', letterSpacing: '0.03em' }}>
              {cabinet.name}
            </h1>
          </div>
          {cabinet.is_active && (
            <span className="italic" style={{ fontSize: '13px', opacity: 0.7 }}>
              ${cabinet.price_usd_session.toFixed(0)} / {t('cabinets.session')}
            </span>
          )}
        </header>

        {cabinet.description && !sessionActive && (
          <p className="italic mb-4 opacity-80" style={{ fontSize: '14px' }}>
            {cabinet.description}
          </p>
        )}

        {error && (
          <div
            className="rounded-md p-3 mb-4 italic"
            style={{
              fontSize: '14px',
              backgroundColor: 'var(--color-terracotta-dark)',
              color: 'var(--color-parchment)',
            }}
          >
            {error}
          </div>
        )}

        {/* INTAKE FORM (до старта сессии) */}
        {!session && cabinet.is_active && fields.length > 0 && (
          <section
            className="rounded-md border p-5 mb-5"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <h2 className="mb-3" style={{ fontSize: '16px', letterSpacing: '0.03em' }}>
              {t('cabinets.intake_title')}
            </h2>
            {fields.map((f) => (
              <div key={f.name} className="mb-3">
                <label className="italic block mb-1" style={{ fontSize: '13px', opacity: 0.85 }}>
                  {f.label}{f.required ? ' *' : ''}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={intakeData[f.name] ?? ''}
                    onChange={(e) => setIntakeData({ ...intakeData, [f.name]: e.target.value })}
                    className={clsx('w-full rounded-md border outline-none', isDark ? 'dom-input-dark' : 'dom-input')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                      borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                      color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                    }}
                  />
                ) : f.type === 'select' && f.options ? (
                  <select
                    value={intakeData[f.name] ?? ''}
                    onChange={(e) => setIntakeData({ ...intakeData, [f.name]: e.target.value })}
                    className="rounded-md border px-2 py-1"
                    style={{
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                      borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                      color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                    }}
                  >
                    <option value="">—</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                    value={intakeData[f.name] ?? ''}
                    onChange={(e) => setIntakeData({ ...intakeData, [f.name]: e.target.value })}
                    className={clsx('w-full rounded-md border outline-none', isDark ? 'dom-input-dark' : 'dom-input')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                      borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                      color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                    }}
                  />
                )}
              </div>
            ))}
            <button
              onClick={() => void startSession()}
              disabled={busy}
              className="rounded-md border italic mt-2"
              style={{
                padding: '8px 18px',
                fontSize: '14px',
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
              }}
            >
              {busy ? '…' : t('cabinets.start_session')}
            </button>
          </section>
        )}

        {/* Если intake пустой - сразу старт */}
        {!session && cabinet.is_active && fields.length === 0 && (
          <button
            onClick={() => void startSession()}
            disabled={busy}
            className="rounded-md border italic"
            style={{
              padding: '10px 22px',
              fontSize: '15px',
              fontFamily: 'inherit',
              backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
              color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
            }}
          >
            {busy ? '…' : t('cabinets.start_session')}
          </button>
        )}

        {/* PAYMENT REQUIRED — сессия создана, но не оплачена и не семья */}
        {session && session.payment_status === 'pending' && (
          <section
            className="rounded-md border p-5 mb-5"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <h2 className="mb-3" style={{ fontSize: '16px', letterSpacing: '0.03em' }}>
              {t('cabinets.choose_payment')}
            </h2>
            <p className="italic mb-4 opacity-80" style={{ fontSize: '14px' }}>
              {t('cabinets.payment_required', { price: cabinet.price_usd_session.toFixed(2) })}
            </p>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => void payLemon('session')}
                disabled={busy}
                className="rounded-md border italic disabled:opacity-50"
                style={{
                  padding: '10px 18px', fontSize: '14px', fontFamily: 'inherit',
                  backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
                  color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
                }}
              >
                {busy ? '…' : t('cabinets.pay_card', { price: cabinet.price_usd_session.toFixed(2) })}
              </button>
              {cabinet.price_usd_subscription_monthly && (
                <button
                  onClick={() => void payLemon('subscription')}
                  disabled={busy}
                  className="rounded-md border italic disabled:opacity-50"
                  style={{
                    padding: '10px 18px', fontSize: '14px', fontFamily: 'inherit',
                    backgroundColor: 'transparent',
                    color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                    borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  }}
                >
                  {t('cabinets.pay_monthly', { price: cabinet.price_usd_subscription_monthly.toFixed(2) })}
                </button>
              )}
              <button
                onClick={() => void payCrypto()}
                disabled={busy}
                className="rounded-md border italic disabled:opacity-50"
                style={{
                  padding: '10px 18px', fontSize: '14px', fontFamily: 'inherit',
                  backgroundColor: 'transparent',
                  color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                }}
              >
                {t('cabinets.pay_crypto')}
              </button>
            </div>

            {cryptoInfo && (
              <div
                className="rounded-md border p-4 mt-2"
                style={{
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  fontSize: '13px',
                }}
              >
                <p className="italic mb-2 opacity-80">{t('cabinets.crypto_instructions')}</p>
                <div className="mb-2">
                  <span className="opacity-60">{t('cabinets.crypto_amount')}: </span>
                  <code style={{ fontSize: '15px', fontWeight: 600 }}>{cryptoInfo.amount} USDT</code>
                </div>
                <div className="mb-2">
                  <span className="opacity-60">{t('cabinets.crypto_wallet')}: </span>
                  <code style={{ fontSize: '13px', wordBreak: 'break-all' }}>{cryptoInfo.wallet}</code>
                </div>
                <div className="opacity-70 italic" style={{ fontSize: '12px' }}>
                  {t('cabinets.crypto_polling', { id: cryptoInfo.payment_id })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* CHAT */}
        {sessionActive && (
          <section className="mt-4">
            <div
              className="rounded-md border p-4 mb-3 overflow-y-auto"
              style={{
                minHeight: '300px',
                maxHeight: '55vh',
                borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
              }}
            >
              {messages.length === 0 && (
                <p className="italic opacity-70" style={{ fontSize: '14px' }}>
                  {t('cabinets.start_hint')}
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className="mb-3">
                  <span className="italic opacity-60" style={{ fontSize: '12px' }}>
                    {m.role === 'user' ? '·' : '✦ Адам'}
                  </span>
                  <div style={{ fontSize: '15px', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              ))}
              {busy && (
                <div className="italic opacity-70" style={{ fontSize: '13px' }}>✦ …</div>
              )}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder={t('cabinets.input_placeholder')}
                disabled={busy}
                className={clsx('flex-1 rounded-md border outline-none resize-none', isDark ? 'dom-input-dark' : 'dom-input')}
                style={{
                  padding: '10px 14px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  maxHeight: '30vh',
                  overflowY: 'auto',
                  backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                }}
              />
              <button
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                className="rounded-md border italic disabled:opacity-50"
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
                  color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
                }}
              >
                {t('common.send')}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
