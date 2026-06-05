// PricingPage -- публичный каталог 13 кабинетов Адама с ценами.
// 2026-06-05 вечер. Стиль наследует LandingPage (пергамент + охра + serif).
// Открытые -> ведут на /chat?cabinet=<slug>.
// Закрытые (creator_grant) -> /chat?request_cabinet=<slug>.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cabinetsPublic, type PublicCabinet } from '../api/cabinets'
import { FontScaleSwitch } from './FontScaleSwitch'
import { useDarkMode } from '../hooks/useDarkMode'
import { useFontScale } from '../hooks/useFontScale'

const ALL_ACCESS_HREF = '/chat?subscribe=all_access'

export function PricingPage(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { isDark, setPref } = useDarkMode()
  const toggleDark = (): void => setPref(isDark ? 'light' : 'dark')
  const { scale: fontScale, setScale: setFontScale } = useFontScale()

  const [cabs, setCabs] = useState<PublicCabinet[] | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    document.title = t('pricing.page_title')
  }, [t])

  useEffect(() => {
    let cancelled = false
    cabinetsPublic()
      .then((data) => { if (!cancelled) setCabs(data) })
      .catch(() => { if (!cancelled) setError(t('pricing.load_failed')) })
    return () => { cancelled = true }
  }, [t])

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const accent = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'

  const landingLangs = [
    { code: 'ru', label: 'РУ' },
    { code: 'uk', label: 'УК' },
    { code: 'en', label: 'EN' },
    { code: 'pl', label: 'PL' },
    { code: 'de', label: 'DE' },
  ]
  const activeLang = landingLangs.find((l) => i18n.language?.startsWith(l.code))?.code ?? 'ru'

  const open = (cabs ?? []).filter((c) => c.access_mode !== 'creator_grant')
  const closed = (cabs ?? []).filter((c) => c.access_mode === 'creator_grant')

  const renderCard = (c: PublicCabinet): React.ReactElement => {
    const isClosed = c.access_mode === 'creator_grant'
    const href = isClosed
      ? `/chat?request_cabinet=${encodeURIComponent(c.slug)}`
      : `/chat?cabinet=${encodeURIComponent(c.slug)}`
    const priceFmt = (p: number): string => Number.isInteger(p) ? `$${p}` : `$${p.toFixed(2)}`
    return (
      <div
        key={c.slug}
        className="rounded-md p-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
        }}
      >
        <h3 className="italic mb-2" style={{ fontSize: '20px', letterSpacing: '0.03em' }}>{c.name}</h3>
        {c.description && (
          <p className="opacity-75 mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>{c.description}</p>
        )}
        {!isClosed && (
          <div className="mb-4" style={{ fontSize: '14px' }}>
            <div style={{ fontSize: '17px' }}>
              {t('pricing.per_session', { price: priceFmt(c.price_usd_session) })}
            </div>
            {c.price_usd_subscription_monthly != null && c.price_usd_subscription_monthly > 0 && (
              <div className="italic opacity-70 mt-1">
                {t('pricing.subscription_hint', { price: priceFmt(c.price_usd_subscription_monthly) })}
              </div>
            )}
          </div>
        )}
        <a
          href={href}
          className="inline-block italic"
          style={{
            padding: '10px 22px',
            fontSize: '14px',
            backgroundColor: isClosed ? 'transparent' : accent,
            color: isClosed ? fg : (isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'),
            border: `1px solid ${accent}`,
            borderRadius: '6px',
            letterSpacing: '0.08em',
            textDecoration: 'none',
          }}
        >
          {isClosed ? t('pricing.request_access') : t('pricing.open_cabinet')}
        </a>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen font-serif"
      style={{ fontFamily: 'var(--font-serif)', backgroundColor: bg, color: fg }}
    >
      {/* HEADER -- структурно повторяет LandingPage */}
      <header
        className="flex items-center justify-between max-w-5xl mx-auto px-6 sm:px-10 pt-8"
        style={{ fontSize: '13px' }}
      >
        <a href="/" className="italic opacity-70" style={{ letterSpacing: '0.25em', color: 'inherit', textDecoration: 'none' }}>
          {t('landing.brand')}
        </a>
        <div className="flex items-center gap-5 opacity-70 flex-wrap justify-end">
          <FontScaleSwitch value={fontScale} onChange={setFontScale} ariaLabel={t('landing.font_size')} />
          <div className="flex items-baseline gap-2" role="group" aria-label="Language">
            {landingLangs.map((l) => (
              <button
                key={l.code}
                onClick={() => void i18n.changeLanguage(l.code)}
                aria-pressed={activeLang === l.code}
                className="italic"
                style={{
                  fontSize: '13px',
                  opacity: activeLang === l.code ? 1 : 0.55,
                  textDecoration: activeLang === l.code ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '1px',
                  padding: '2px 2px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'inherit',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={toggleDark} className="italic underline underline-offset-4 decoration-1">
            {isDark ? t('landing.light_mode') : t('landing.dark_mode')}
          </button>
        </div>
      </header>

      {/* HERO */}
      <main className="max-w-5xl mx-auto px-6 sm:px-10 pt-20 pb-16">
        <p
          className="italic mb-4 opacity-60 text-center"
          style={{ fontSize: '12px', letterSpacing: '0.4em', textTransform: 'uppercase' }}
        >
          {t('pricing.eyebrow')}
        </p>
        <h1
          className="text-center mb-6"
          style={{
            fontSize: 'clamp(34px, 7vw, 56px)',
            letterSpacing: '0.04em', fontWeight: 400, lineHeight: 1.1,
          }}
        >
          {t('pricing.title')}
        </h1>
        <p
          className="italic text-center mb-12 opacity-75 max-w-2xl mx-auto"
          style={{ fontSize: '17px', lineHeight: 1.6 }}
        >
          {t('pricing.intro')}
        </p>

        {error && (
          <p className="text-center opacity-70 italic" style={{ fontSize: '14px' }}>{error}</p>
        )}
        {!error && cabs === null && (
          <p className="text-center opacity-60 italic" style={{ fontSize: '14px' }}>{t('pricing.loading')}</p>
        )}

        {cabs !== null && open.length > 0 && (
          <section className="mb-16">
            <h2
              className="italic mb-6 opacity-70"
              style={{ fontSize: '14px', letterSpacing: '0.3em', textTransform: 'uppercase' }}
            >
              {t('pricing.section_open')}
            </h2>
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {open.map(renderCard)}
            </div>
          </section>
        )}

        {/* All-access кнопка -- между секциями */}
        {cabs !== null && open.length > 0 && (
          <section className="mb-16 text-center">
            <div
              className="inline-block rounded-md p-6"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                maxWidth: '420px',
              }}
            >
              <h3 className="italic mb-2" style={{ fontSize: '20px' }}>{t('pricing.all_access_title')}</h3>
              <p className="opacity-75 mb-3" style={{ fontSize: '14px' }}>{t('pricing.all_access_body')}</p>
              <div className="mb-4" style={{ fontSize: '17px' }}>{t('pricing.all_access_price')}</div>
              <a
                href={ALL_ACCESS_HREF}
                className="inline-block italic"
                style={{
                  padding: '10px 28px',
                  fontSize: '14px',
                  backgroundColor: accent,
                  color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                  border: `1px solid ${accent}`,
                  borderRadius: '6px',
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                }}
              >
                {t('pricing.all_access_button')}
              </a>
            </div>
          </section>
        )}

        {cabs !== null && closed.length > 0 && (
          <section className="mb-12">
            <h2
              className="italic mb-6 opacity-70"
              style={{ fontSize: '14px', letterSpacing: '0.3em', textTransform: 'uppercase' }}
            >
              {t('pricing.section_closed')}
            </h2>
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {closed.map(renderCard)}
            </div>
          </section>
        )}

        {/* Footnotes */}
        <div className="text-center mt-16 opacity-60 italic" style={{ fontSize: '13px', lineHeight: 1.7 }}>
          <p>{t('pricing.free_for_family_note')}</p>
          <p className="mt-2">{t('pricing.footnote')}</p>
          <p className="mt-6">
            <a href="/" style={{ color: 'inherit' }}>{t('pricing.back_to_landing')}</a>
          </p>
        </div>
      </main>
    </div>
  )
}
