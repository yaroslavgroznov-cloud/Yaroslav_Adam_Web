// CabinetSessionPage — F.41 fix, 2026-05-28.
// Route /cabinets/{slug} — intake форма + чат внутри конкретного кабинета.
import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import {
  cabinetsList, cabinetSessionCreate, cabinetChat,
  cabinetSessionGet, cabinetSessionActive, cabinetSessionMessages,
  cabinetSessionClose, paymentInitiate, startAllAccessSubscription,
} from '../api/cabinets'
import type { Cabinet, CabinetSession, CabinetMessageAttachment } from '../api/cabinets'
import { filesConfig, uploadFile } from '../api/files'
import type { FileMeta, FilesConfig } from '../api/files'
import { useDarkMode } from '../hooks/useDarkMode'
import { MessageBubble } from './MessageBubble'

interface ChatLine {
  role: 'user' | 'assistant'
  content: string
  // attachments из локального uploadFile (только что отправленные в этой сессии браузера)
  attachments?: FileMeta[]
  // attachments из истории сессии (подгруженные через GET /messages)
  historyAttachments?: CabinetMessageAttachment[]
}

// MIME-категория → accept атрибут для file input
const TYPE_ACCEPTS: Record<string, string> = {
  image: 'image/*',
  video: 'video/*',
  document: 'application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown',
}

function buildAcceptString(types: string[] | undefined): string {
  if (!types || types.length === 0) return ''
  return types.map((t) => TYPE_ACCEPTS[t] || '').filter(Boolean).join(',')
}

function getSlugFromPath(): string {
  const m = window.location.pathname.match(/^\/cabinets\/([^/?#]+)/)
  return m ? m[1] : ''
}

export function CabinetSessionPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  // Канон Brand Kit v1.2 (House of Groznov) — добавлено 2026-06-07
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const gold = isDark ? 'var(--color-house-gold-soft)' : 'var(--color-house-gold)'
  const slug = getSlugFromPath()
  const [cabinet, setCabinet] = useState<Cabinet | null>(null)
  const [session, setSession] = useState<CabinetSession | null>(null)
  const [intakeData, setIntakeData] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ChatLine[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cryptoInfo, setCryptoInfo] = useState<{wallet: string; amount: string; payment_id: number} | null>(null)
  // F.41/F.58: attachments в кабинете
  const [filesCfg, setFilesCfg] = useState<FilesConfig | null>(null)
  const [pendingFiles, setPendingFiles] = useState<FileMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        // F.41/F.58: подтягиваем files config — нужен для max_bytes и enabled
        try {
          setFilesCfg(await filesConfig())
        } catch { /* файлы могут быть отключены — кнопка не покажется */ }
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
        let resolvedSession: CabinetSession | null = null
        if (sidStr) {
          try {
            const sid = parseInt(sidStr, 10)
            const s = await cabinetSessionGet(sid)
            resolvedSession = s
            if (paymentFlag === 'success' && s.payment_status === 'pending') {
              // Webhook ещё мог не успеть — поллим до 20 сек
              for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 2000))
                const s2 = await cabinetSessionGet(sid)
                if (s2.payment_status !== 'pending') { resolvedSession = s2; break }
              }
            }
            // очистим query string
            window.history.replaceState({}, '', `/cabinets/${slug}`)
          } catch {/* ignore */}
        } else if (found && found.is_active) {
          // F.41 «непрерывность нити»: нет ?session= → проверяем
          // последнюю незакрытую активную сессию юзера в этом кабинете.
          // Если есть — подхватываем, чтобы юзер увидел продолжение
          // разговора, а не пустую форму intake.
          try {
            resolvedSession = await cabinetSessionActive(slug)
          } catch { /* нет — покажем intake (нормально) */ }
        }
        if (resolvedSession) {
          setSession(resolvedSession)
          // Подгружаем последние 20 сообщений для отображения «нити»
          if (
            resolvedSession.payment_status === 'paid' ||
            resolvedSession.payment_status === 'free_family'
          ) {
            try {
              const history = await cabinetSessionMessages(resolvedSession.id, 20)
              setMessages(history.map((m) => ({
                role: m.role,
                content: m.content,
                historyAttachments: m.attachments,
              })))
            } catch { /* история не критична для рендера */ }
          }
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

  async function payAllAccess(): Promise<void> {
    setBusy(true); setError('')
    try {
      const res = await startAllAccessSubscription()
      const url = (res.next_action as { checkout_url?: string } | null)?.checkout_url
      if (url) window.location.href = url
      else setError(t('cabinets.payment_init_failed'))
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

  async function startFresh(): Promise<void> {
    // F.41 «× с чистого листа»: закрываем текущую сессию (это запустит
    // generate_session_summary → попадёт в карточку Адама, контекст
    // сохранится в его памяти, но новая сессия начнётся пустой).
    if (!session || busy) return
    if (!window.confirm(t('cabinets.confirm_fresh_start'))) return
    setBusy(true)
    setError('')
    try {
      try { await cabinetSessionClose(session.id) } catch { /* идемпотентно */ }
      setSession(null)
      setMessages([])
      setIntakeData({})
      setPendingFiles([])
      setInput('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleFilePick(files: FileList | null): Promise<void> {
    if (!files || files.length === 0 || !filesCfg?.enabled) return
    const maxN = cabinet?.intake_form?._attachments?.max_per_message ?? 4
    const free = Math.max(0, maxN - pendingFiles.length)
    if (free === 0) {
      setError(t('cabinets.attachment_limit', { n: maxN }))
      return
    }
    const slice = Array.from(files).slice(0, free)
    setUploading(true)
    setError('')
    try {
      const uploaded: FileMeta[] = []
      for (const f of slice) {
        if (f.size > filesCfg.max_bytes) {
          setError(t('attachment.too_large', { mb: (filesCfg.max_bytes / 1024 / 1024).toFixed(0) }))
          continue
        }
        const meta = await uploadFile(f)
        uploaded.push(meta)
      }
      setPendingFiles((prev) => [...prev, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('attachment.upload_failed'))
    } finally {
      setUploading(false)
    }
  }

  function removePending(id: number): void {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function send(): Promise<void> {
    if (!session || busy) return
    const trimmed = input.trim()
    if (!trimmed && pendingFiles.length === 0) return
    const userMsg = trimmed || (pendingFiles.length > 0 ? '📎' : '')
    const attIds = pendingFiles.map((f) => f.id)
    const sentAttachments = [...pendingFiles]
    setInput('')
    setPendingFiles([])
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, attachments: sentAttachments }])
    setBusy(true)
    try {
      const r = await cabinetChat(session.id, userMsg, attIds.length > 0 ? attIds : null)
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
            <h1 className="font-medium mt-1" style={{ fontSize: '22px', letterSpacing: '0.03em', color: burgundy }}>
              {t(`cabinets_catalog.${cabinet.slug}.name`, { defaultValue: cabinet.name })}
            </h1>
          </div>
          {cabinet.is_active && (
            <span className="italic" style={{ fontSize: '13px', opacity: 0.7 }}>
              ${cabinet.price_usd_session.toFixed(0)} / {t('cabinets.session')}
            </span>
          )}
        </header>

        {!sessionActive && t(`cabinets_catalog.${cabinet.slug}.description`, { defaultValue: cabinet.description ?? '' }) && (
          <p className="italic mb-4 opacity-80" style={{ fontSize: '14px' }}>
            {t(`cabinets_catalog.${cabinet.slug}.description`, { defaultValue: cabinet.description ?? '' })}
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
            <h2 className="mb-3" style={{ fontSize: '16px', letterSpacing: '0.03em', color: gold }}>
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
                backgroundColor: burgundy,
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                borderColor: burgundy,
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
              backgroundColor: burgundy,
              color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
              borderColor: burgundy,
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
            <h2 className="mb-3" style={{ fontSize: '16px', letterSpacing: '0.03em', color: gold }}>
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
                  backgroundColor: burgundy,
                  color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  borderColor: burgundy,
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
              {/* F.70 / Council 3.3: NOWPayments / USDT TRC20 минимум ~$15.
                  Для кабинетов дешевле кнопка скрыта — те идут только через WFP. */}
              {cabinet.price_usd_session >= 15 && (
                <button
                  type="button"
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
              )}
            </div>

            {/* F.52: all-access подписка $39/мес */}
            <div
              className="rounded-md border p-3 mt-3 italic"
              style={{
                borderStyle: 'dashed',
                borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                fontSize: '13px',
                opacity: 0.9,
              }}
            >
              {t('cabinets.all_access_hint')}{' '}
              <button
                onClick={() => void payAllAccess()}
                disabled={busy}
                className="underline underline-offset-4 decoration-1 italic"
                style={{ color: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {t('cabinets.all_access_cta')}
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
            {/* F.41 «нить»: если есть подгруженная история — показываем
                кнопку «× начать с чистого листа». Иначе (новая сессия) —
                кнопки нет. */}
            {messages.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className="italic" style={{ fontSize: '12px', opacity: 0.6 }}>
                  {t('cabinets.history_resumed')}
                </span>
                <button
                  type="button"
                  onClick={() => void startFresh()}
                  disabled={busy}
                  className="italic underline underline-offset-4 decoration-1 disabled:opacity-50"
                  style={{
                    fontSize: '12px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                  }}
                  aria-label={t('cabinets.fresh_start_btn')}
                  title={t('cabinets.fresh_start_hint')}
                >
                  × {t('cabinets.fresh_start_btn')}
                </button>
              </div>
            )}
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
                <div key={i}>
                  <MessageBubble role={m.role} content={m.content} isDark={isDark} />
                  {m.attachments && m.attachments.length > 0 && (
                    <div className={clsx('flex flex-wrap gap-2 mb-3 -mt-1', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {m.attachments.map((a) => (
                        <span
                          key={a.id}
                          className="italic rounded-md border px-2 py-1"
                          style={{
                            fontSize: '11px',
                            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                            backgroundColor: 'transparent',
                            opacity: 0.75,
                          }}
                        >
                          {a.is_image ? '🖼' : '📎'} {a.original_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.historyAttachments && m.historyAttachments.length > 0 && (
                    <div className={clsx('flex flex-wrap gap-2 mb-3 -mt-1', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {m.historyAttachments.map((a) => (
                        <span
                          key={a.id}
                          className="italic rounded-md border px-2 py-1"
                          style={{
                            fontSize: '11px',
                            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                            backgroundColor: 'transparent',
                            opacity: 0.75,
                          }}
                        >
                          {a.is_image ? '🖼' : '📎'} {a.original_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="italic opacity-70" style={{ fontSize: '13px' }}>✦ …</div>
              )}
              <div ref={endRef} />
            </div>
            {/* Pending attachments preview (chips) */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingFiles.map((f) => (
                  <span
                    key={f.id}
                    className="italic rounded-md border px-2 py-1 inline-flex items-center gap-2"
                    style={{
                      fontSize: '12px',
                      borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                      backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                    }}
                  >
                    <span>{f.is_image ? '🖼' : '📎'} {f.original_name}</span>
                    <button
                      type="button"
                      onClick={() => removePending(f.id)}
                      aria-label={t('attachment.remove')}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '14px', lineHeight: 1, padding: '0 2px',
                        color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/*
              F.41/F.58 + мобильный фикс:
              flex-row, textarea = flex-1 (растягивается на всё свободное),
              кнопки = shrink-0 фиксированной width.
              На мобиле — иконки без текста (44×44 square — touch-friendly).
              На sm+ — добавляем текст «Голос», «Отправить» через `sm:` префикс.
            */}
            <div className="flex gap-1.5 sm:gap-2 items-end">
              {/* Hidden file input + attach button (только если кабинет поддерживает) */}
              {cabinet.intake_form?._attachments?.enabled && filesCfg?.enabled && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    aria-label={t('attachment.pick_file')}
                    title={t('attachment.pick_file')}
                    accept={buildAcceptString(cabinet.intake_form?._attachments?.types)}
                    onChange={(e) => {
                      void handleFilePick(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || busy}
                    className="shrink-0 inline-flex items-center justify-center rounded-md border disabled:opacity-50"
                    style={{
                      width: 44, height: 44,
                      borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                      color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                      backgroundColor: 'transparent',
                    }}
                    aria-label={t('attachment.pick_file')}
                    title={cabinet.intake_form?._attachments?.hint || t('attachment.pick_file')}
                  >
                    {uploading ? (
                      <span className="italic" style={{ fontSize: '11px' }}>…</span>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    )}
                  </button>
                </>
              )}
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
                className={clsx('flex-1 min-w-0 rounded-md border outline-none resize-none', isDark ? 'dom-input-dark' : 'dom-input')}
                style={{
                  padding: '10px 12px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  maxHeight: '30vh',
                  overflowY: 'auto',
                  backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                }}
              />
              <a
                href={`/?voice=1&cabinet_session=${session?.id ?? ''}`}
                aria-label={t('cabinets.voice_in_cabinet')}
                title={t('cabinets.voice_in_cabinet')}
                className="shrink-0 inline-flex items-center justify-center rounded-md border italic"
                style={{
                  width: 44, height: 44,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: 'transparent',
                  color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  textDecoration: 'none',
                }}
              >
                ◉
              </a>
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || (!input.trim() && pendingFiles.length === 0)}
                className="shrink-0 inline-flex items-center justify-center rounded-md border italic disabled:opacity-50"
                style={{
                  minWidth: 44, height: 44,
                  padding: '0 12px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: burgundy,
                  color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  borderColor: burgundy,
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
