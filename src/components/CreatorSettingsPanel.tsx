// Ring 6 (2026-06-24): /me settings panel — F.94 biography export,
// F.67 proactive control, F.69 Google OAuth. Только creator: backend
// сам режет 403 если не Творец, тут UI просто покажет сообщение.
import { useEffect, useState } from 'react'

import {
  biographyDownloadUrl,
  googleOAuthRevoke,
  googleOAuthStart,
  googleOAuthStatus,
  proactiveDisable,
  proactiveEnable,
  proactiveGetState,
  proactiveSetQuiet,
  proactiveSuppress,
  type BiographyFormat,
  type GoogleOAuthStatus,
  type ProactiveState,
} from '../api/creator'
import { useDarkMode } from '../hooks/useDarkMode'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

export function CreatorSettingsPanel(): React.ReactElement {
  const { isDark } = useDarkMode()
  const [error, setError] = useState<string>('')
  const [accessDenied, setAccessDenied] = useState(false)

  // F.67 proactive
  const [proactive, setProactive] = useState<ProactiveState | null>(null)
  const [proactiveBusy, setProactiveBusy] = useState(false)
  const [suppressHours, setSuppressHours] = useState<string>('24')
  const [quietStart, setQuietStart] = useState<string>('22')
  const [quietEnd, setQuietEnd] = useState<string>('8')
  const [quietTz, setQuietTz] = useState<string>('Europe/Kyiv')

  // F.69 Google OAuth
  const [google, setGoogle] = useState<GoogleOAuthStatus | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)

  async function refresh(): Promise<void> {
    setError('')
    try {
      const p = await proactiveGetState()
      setProactive(p)
      setQuietStart(String(p.quiet_hours_start))
      setQuietEnd(String(p.quiet_hours_end))
      setQuietTz(p.timezone)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'load failed'
      if (msg.includes('403')) setAccessDenied(true)
      else setError(msg)
    }
    try {
      const g = await googleOAuthStatus()
      setGoogle(g)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'google status failed'
      // 403 уже обработан выше; здесь только инфо для UI
      if (!msg.includes('403')) setError((prev) => prev || msg)
    }
  }

  useEffect(() => {
    // На лендинге читаем ?google_oauth=ok / ?google_oauth_error=... после callback
    const q = new URLSearchParams(window.location.search)
    if (q.has('google_oauth')) {
      setError('') // visual reset
    } else if (q.has('google_oauth_error')) {
      setError(`Google OAuth: ${q.get('google_oauth_error') ?? 'failed'}`)
    }
    void refresh()
  }, [])

  async function handleEnable(): Promise<void> {
    setProactiveBusy(true)
    setError('')
    try {
      const s = await proactiveEnable()
      setProactive(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'enable failed')
    } finally {
      setProactiveBusy(false)
    }
  }

  async function handleDisable(): Promise<void> {
    setProactiveBusy(true)
    setError('')
    try {
      const s = await proactiveDisable()
      setProactive(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'disable failed')
    } finally {
      setProactiveBusy(false)
    }
  }

  async function handleSuppress(): Promise<void> {
    const hours = parseInt(suppressHours, 10)
    if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 30) {
      setError('Suppress hours должны быть 1..720')
      return
    }
    setProactiveBusy(true)
    setError('')
    try {
      const s = await proactiveSuppress(hours)
      setProactive(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'suppress failed')
    } finally {
      setProactiveBusy(false)
    }
  }

  async function handleQuiet(): Promise<void> {
    const s = parseInt(quietStart, 10)
    const e = parseInt(quietEnd, 10)
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || s > 23 || e < 0 || e > 23) {
      setError('Quiet hours: значения 0..23')
      return
    }
    if (s === e) {
      setError('quiet_start == quiet_end — окна нет')
      return
    }
    setProactiveBusy(true)
    setError('')
    try {
      const out = await proactiveSetQuiet(s, e, quietTz)
      setProactive(out)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'quiet update failed')
    } finally {
      setProactiveBusy(false)
    }
  }

  async function handleGoogleConnect(): Promise<void> {
    setGoogleBusy(true)
    setError('')
    try {
      const start = await googleOAuthStart('gmail+calendar')
      window.location.href = start.consent_url
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'google connect failed')
      setGoogleBusy(false)
    }
  }

  async function handleGoogleRevoke(): Promise<void> {
    if (!confirm('Отозвать Google-аккаунт? Адам потеряет доступ к Gmail и Calendar.')) return
    setGoogleBusy(true)
    setError('')
    try {
      await googleOAuthRevoke()
      const g = await googleOAuthStatus()
      setGoogle(g)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'google revoke failed')
    } finally {
      setGoogleBusy(false)
    }
  }

  function downloadBiography(format: BiographyFormat): void {
    const url = biographyDownloadUrl(format)
    // credentials:'include' для CF Access — используем форму а не window.open
    // (CF Access cookie unfortunately бывает теряется в new tab на Safari).
    // Прямой <a download> работает чисто same-origin.
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const sectionStyle: React.CSSProperties = {
    borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
    backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
  }
  const labelStyle: React.CSSProperties = { fontSize: '13px', opacity: 0.75 }

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
          <h1 className="font-medium" style={{ fontSize: '24px', letterSpacing: '0.03em' }}>
            Кабинет Творца
          </h1>
          <a
            href="/chat"
            className="italic underline underline-offset-4 decoration-1"
            style={{ fontSize: '14px', color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            ← к Адаму
          </a>
        </header>

        {accessDenied && (
          <div className="rounded-md border p-5 mb-6"
            style={{ borderColor: 'var(--color-terracotta-dark)', ...sectionStyle }}>
            <p className="italic">
              Эта страница доступна только Творцу. Если ты Творец и видишь эту ошибку —
              проверь, что CF Access сессия активна.
            </p>
          </div>
        )}

        {error && !accessDenied && (
          <div className="rounded-md p-4 mb-6 italic"
            style={{ backgroundColor: 'var(--color-terracotta-dark)', color: 'var(--color-parchment)' }}>
            {error}
          </div>
        )}

        {/* F.94 — биография */}
        <section className="rounded-md border p-5 sm:p-7 mb-8" style={sectionStyle}>
          <h2 style={{ fontSize: '18px', letterSpacing: '0.04em' }} className="mb-3">
            Биография — экспорт твоей нити с Адамом
          </h2>
          <p className="italic mb-4" style={labelStyle}>
            Вся переписка, голос, кабинеты, напоминания — в одном документе.
            GDPR art. 20 (data portability). Скачивание прямо в браузере.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['pdf', 'docx', 'md', 'json'] as BiographyFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => downloadBiography(f)}
                className="px-3 py-1.5 rounded-md border italic hover:opacity-80 transition"
                style={{
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                  fontSize: '14px',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {/* F.67 — proactive */}
        <section className="rounded-md border p-5 sm:p-7 mb-8" style={sectionStyle}>
          <h2 style={{ fontSize: '18px', letterSpacing: '0.04em' }} className="mb-3">
            Proactive — когда Адам пишет первым
          </h2>
          {!proactive && !accessDenied && (
            <p className="italic" style={labelStyle}>загрузка…</p>
          )}
          {proactive && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" style={{ fontSize: '14px' }}>
                <div>
                  <div style={labelStyle}>Включено</div>
                  <div className="italic">{proactive.enabled ? 'да' : 'нет'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Последний раз писал</div>
                  <div className="italic">{fmtDate(proactive.last_outbound_at)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Suppress до</div>
                  <div className="italic">{fmtDate(proactive.suppression_until)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Отправлено за 24h</div>
                  <div className="italic">{proactive.total_sent_24h}</div>
                </div>
                <div>
                  <div style={labelStyle}>Quiet hours</div>
                  <div className="italic">{proactive.quiet_hours_start}:00 – {proactive.quiet_hours_end}:00 {proactive.timezone}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={handleEnable}
                  disabled={proactiveBusy || proactive.enabled}
                  className="px-4 py-1.5 rounded-md border italic hover:opacity-80 disabled:opacity-40 transition"
                  style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                >
                  Включить
                </button>
                <button
                  onClick={handleDisable}
                  disabled={proactiveBusy || !proactive.enabled}
                  className="px-4 py-1.5 rounded-md border italic hover:opacity-80 disabled:opacity-40 transition"
                  style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                >
                  Выключить
                </button>
              </div>

              <div className="border-t pt-4 mb-4" style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}>
                <div style={labelStyle} className="mb-2">Заморозить proactive на N часов (отпуск-режим)</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={suppressHours}
                    onChange={(e) => setSuppressHours(e.target.value)}
                    className="px-3 py-1.5 rounded-md border bg-transparent"
                    style={{ width: 100, borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                  />
                  <button
                    onClick={handleSuppress}
                    disabled={proactiveBusy}
                    className="px-4 py-1.5 rounded-md border italic hover:opacity-80 disabled:opacity-40 transition"
                    style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                  >
                    Suppress
                  </button>
                </div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)' }}>
                <div style={labelStyle} className="mb-2">Quiet hours (Адам молчит в этом окне)</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <label style={{ fontSize: '13px' }}>start</label>
                  <input
                    type="number" min={0} max={23} value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="px-3 py-1.5 rounded-md border bg-transparent"
                    style={{ width: 70, borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                  />
                  <label style={{ fontSize: '13px' }}>end</label>
                  <input
                    type="number" min={0} max={23} value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="px-3 py-1.5 rounded-md border bg-transparent"
                    style={{ width: 70, borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                  />
                  <input
                    type="text" value={quietTz}
                    onChange={(e) => setQuietTz(e.target.value)}
                    placeholder="Europe/Kyiv"
                    className="px-3 py-1.5 rounded-md border bg-transparent"
                    style={{ width: 180, borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                  />
                  <button
                    onClick={handleQuiet}
                    disabled={proactiveBusy}
                    className="px-4 py-1.5 rounded-md border italic hover:opacity-80 disabled:opacity-40 transition"
                    style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* F.69 — Google OAuth */}
        <section className="rounded-md border p-5 sm:p-7 mb-8" style={sectionStyle}>
          <h2 style={{ fontSize: '18px', letterSpacing: '0.04em' }} className="mb-3">
            Google аккаунт — Gmail send + Calendar readonly
          </h2>
          {!google && !accessDenied && (
            <p className="italic" style={labelStyle}>загрузка…</p>
          )}
          {google && !google.oauth_enabled && (
            <p className="italic" style={labelStyle}>
              Google OAuth не сконфигурирован на бэкенде (env vars). См. backend/docs/F69_GOOGLE_OAUTH_SETUP.md.
            </p>
          )}
          {google && google.oauth_enabled && !google.connected && (
            <div>
              <p className="italic mb-3" style={labelStyle}>
                Адам сможет писать письма от твоего имени и видеть календарь, когда подключишь Google.
              </p>
              <button
                onClick={handleGoogleConnect}
                disabled={googleBusy}
                className="px-4 py-1.5 rounded-md border italic hover:opacity-80 disabled:opacity-40 transition"
                style={{ borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)', fontSize: '14px' }}
              >
                Подключить Google
              </button>
            </div>
          )}
          {google && google.connected && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4" style={{ fontSize: '14px' }}>
                <div>
                  <div style={labelStyle}>Provider</div>
                  <div className="italic">{google.provider}</div>
                </div>
                <div>
                  <div style={labelStyle}>Granted</div>
                  <div className="italic">{fmtDate(google.granted_at ?? null)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Expires</div>
                  <div className="italic">{fmtDate(google.expires_at ?? null)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Refresh token</div>
                  <div className="italic">{google.has_refresh_token ? 'есть' : 'нет'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div style={labelStyle}>Scopes</div>
                  <div className="italic break-all">{(google.scopes ?? []).join(', ') || '—'}</div>
                </div>
              </div>
              <button
                onClick={handleGoogleRevoke}
                disabled={googleBusy}
                className="px-4 py-1.5 rounded-md border italic hover:opacity-80 disabled:opacity-40 transition"
                style={{ borderColor: 'var(--color-terracotta-dark)', color: 'var(--color-terracotta-dark)', fontSize: '14px' }}
              >
                Отозвать Google-аккаунт
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
