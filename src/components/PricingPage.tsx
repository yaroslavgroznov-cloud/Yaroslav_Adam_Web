// PricingPage -- публічний каталог 13 кабінетів Адама з цінами.
// 2026-06-05 вечір. Стиль успадковує LandingPage (пергамент + охра + serif).
// 2026-06-18 (F.66.3): мульти-валютне відображення (USD + локальна валюта
// по мові + ручний override через CurrencyPicker); тарифні CTA -> BuyModal
// з крипто-чекаутом (картки ще на верифікації LiqPay/Paddle); кабінетні
// CTA залишаються на /chat?cabinet=<slug> (там існуючий crypto-flow в
// CabinetSessionPage).
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cabinetsPublic, type PublicCabinet } from '../api/cabinets'
import { BuyModal, type BuyModalTarget } from './BuyModal'
import { CurrencyPicker } from './CurrencyPicker'
import { FontScaleSwitch } from './FontScaleSwitch'
import { useCurrency } from '../hooks/useCurrency'
import { useDarkMode } from '../hooks/useDarkMode'
import { useFontScale } from '../hooks/useFontScale'
import { CURRENCIES, formatUsd } from '../utils/currency'

export function PricingPage(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { isDark, setPref } = useDarkMode()
  const { currency, formatLocal } = useCurrency()
  // Brand Kit v1.3 (2026-06-09): gold для текста виганяється на пергаменті,
  // використовуємо deep antique gold для eyebrow.
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const goldText = isDark
    ? 'var(--color-house-gold-deep-dark)'
    : 'var(--color-house-gold-deep)'
  const toggleDark = (): void => setPref(isDark ? 'light' : 'dark')
  const { scale: fontScale, setScale: setFontScale } = useFontScale()

  const [cabs, setCabs] = useState<PublicCabinet[] | null>(null)
  const [error, setError] = useState<string>('')
  const [buyTarget, setBuyTarget] = useState<BuyModalTarget | null>(null)

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

  // Унікальний currency-key пере-форсує рендер цін при переключенні валюти.
  const currencyKey = currency ?? 'NONE'

  const renderCard = (c: PublicCabinet): React.ReactElement => {
    const isClosed = c.access_mode === 'creator_grant'
    const href = isClosed
      ? `/chat?request_cabinet=${encodeURIComponent(c.slug)}`
      : `/chat?cabinet=${encodeURIComponent(c.slug)}`
    // 2026-06-10: каталог приходить з API російською. Override через i18n з fallback
    // на API name/description, щоб попередній контракт не ламався при додаванні
    // нового slug, не описаного в локалі.
    const localizedName = t(`cabinets_catalog.${c.slug}.name`, { defaultValue: c.name })
    const localizedDesc = t(`cabinets_catalog.${c.slug}.description`, { defaultValue: c.description ?? '' })
    const localPrice = formatLocal(c.price_usd_session)
    const localSubPrice = c.price_usd_subscription_monthly != null
      ? formatLocal(c.price_usd_subscription_monthly)
      : ''
    return (
      <div
        key={c.slug}
        className="rounded-md p-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <h3 className="italic mb-2" style={{ fontSize: '20px', letterSpacing: '0.03em' }}>{localizedName}</h3>
        {localizedDesc && (
          <p className="opacity-75 mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>{localizedDesc}</p>
        )}
        {!isClosed && (
          <div className="mb-4" style={{ fontSize: '14px' }}>
            <div style={{ fontSize: '17px' }}>
              {t('pricing.per_session', { price: formatUsd(c.price_usd_session) })}
            </div>
            {localPrice && (
              <div className="opacity-65 mt-0.5" style={{ fontSize: '13px' }}>
                {localPrice}
              </div>
            )}
            {c.price_usd_subscription_monthly != null && c.price_usd_subscription_monthly > 0 && (
              <>
                <div className="italic opacity-70 mt-2">
                  {t('pricing.subscription_hint', { price: formatUsd(c.price_usd_subscription_monthly) })}
                </div>
                {localSubPrice && (
                  <div className="opacity-55 mt-0.5" style={{ fontSize: '12px' }}>
                    {localSubPrice}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <a
          href={href}
          className="italic"
          style={{
            marginTop: 'auto',
            alignSelf: 'center',
            padding: '10px 22px',
            fontSize: '14px',
            backgroundColor: isClosed ? 'transparent' : accent,
            color: isClosed ? fg : (isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'),
            border: `1px solid ${accent}`,
            borderRadius: '6px',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          {isClosed ? t('pricing.request_access') : t('pricing.open_cabinet')}
        </a>
      </div>
    )
  }

  // Дані для 4 тарифних карток + соответствующие BuyModal target.
  const tierDefs: Array<{
    id: string
    eyebrowKey: string
    titleKey: string
    subtitleKey?: string
    priceUsd: number
    priceLaunchKey: string
    priceWasKey: string
    perksKeys: string[]
    ctaKey: string
    comingSoonKey?: string
    kind: 'topup' | 'subscription'
    cabinetSlug: string
    featured?: boolean
    premium?: boolean
    accentOverride?: 'burgundy'
  }> = [
    {
      id: 'session',
      eyebrowKey: 'tiers.session_eyebrow',
      titleKey: 'tiers.session_title',
      priceUsd: 9,
      priceLaunchKey: 'tiers.session_price_launch',
      priceWasKey: 'tiers.session_price_was',
      perksKeys: ['tiers.session_perks_l1', 'tiers.session_perks_l2', 'tiers.session_perks_l3'],
      ctaKey: 'tiers.session_cta',
      kind: 'topup',
      cabinetSlug: 'session_topup',
    },
    {
      id: 'topic',
      eyebrowKey: 'tiers.topic_eyebrow',
      titleKey: 'tiers.topic_title',
      priceUsd: 19,
      priceLaunchKey: 'tiers.topic_price_launch',
      priceWasKey: 'tiers.topic_price_was',
      perksKeys: ['tiers.topic_perks_l1', 'tiers.topic_perks_l2', 'tiers.topic_perks_l3'],
      ctaKey: 'tiers.topic_cta',
      comingSoonKey: 'tiers.topic_coming_soon_note',
      kind: 'subscription',
      cabinetSlug: 'topic',
    },
    {
      id: 'all_access',
      eyebrowKey: 'tiers.all_eyebrow',
      titleKey: 'tiers.all_title',
      priceUsd: 39,
      priceLaunchKey: 'tiers.all_price_launch',
      priceWasKey: 'tiers.all_price_was',
      perksKeys: ['tiers.all_perks_l1', 'tiers.all_perks_l2', 'tiers.all_perks_l3'],
      ctaKey: 'tiers.all_cta',
      kind: 'subscription',
      cabinetSlug: 'all_access',
      featured: true,
    },
    {
      id: 'x_tier',
      eyebrowKey: 'tiers.x_eyebrow',
      titleKey: 'tiers.x_title',
      subtitleKey: 'tiers.x_subtitle',
      priceUsd: 99,
      priceLaunchKey: 'tiers.x_price_launch',
      priceWasKey: 'tiers.x_price_was',
      perksKeys: [
        'tiers.x_perks_l1', 'tiers.x_perks_l2', 'tiers.x_perks_l3',
        'tiers.x_perks_l4', 'tiers.x_perks_l5',
      ],
      ctaKey: 'tiers.x_cta',
      kind: 'subscription',
      cabinetSlug: 'x_tier',
      premium: true,
      accentOverride: 'burgundy',
    },
  ]

  const openBuy = (def: typeof tierDefs[number]): void => {
    setBuyTarget({
      id: def.id,
      label: t(def.titleKey),
      hint: t(def.eyebrowKey),
      amount_usd: def.priceUsd,
      kind: def.kind,
      cabinet_slug: def.cabinetSlug,
    })
  }

  return (
    <div
      className="min-h-screen font-serif"
      style={{ fontFamily: 'var(--font-serif)', backgroundColor: bg, color: fg }}
    >
      {/* HEADER -- структурно повторяет LandingPage */}
      <header
        className="flex items-center justify-between max-w-5xl mx-auto px-6 sm:px-10 pt-8 flex-wrap gap-4"
        style={{ fontSize: '13px' }}
      >
        <a href="/" className="italic opacity-70" style={{ letterSpacing: '0.25em', color: 'inherit', textDecoration: 'none' }}>
          {t('landing.brand')}
        </a>
        <div className="flex items-center gap-5 opacity-70 flex-wrap justify-end">
          <FontScaleSwitch value={fontScale} onChange={setFontScale} ariaLabel={t('landing.font_size')} />
          <CurrencyPicker />
          <div className="flex items-baseline gap-2" role="group" aria-label="Language">
            {landingLangs.map((l) => (
              <button
                key={l.code}
                onClick={() => void i18n.changeLanguage(l.code)}
                aria-pressed={activeLang === l.code ? 'true' : 'false'}
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
          className="italic mb-4 text-center"
          style={{
            fontSize: '12px',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: goldText,
            opacity: 0.95,
          }}
        >
          {t('pricing.eyebrow')}
        </p>
        <h1
          className="text-center mb-6"
          style={{
            fontSize: 'clamp(34px, 7vw, 56px)',
            letterSpacing: '0.04em', fontWeight: 500, lineHeight: 1.1,
            color: burgundy,
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

        {/* Launch banner — спасибо первым */}
        <p
          className="italic text-center mb-12 opacity-85"
          style={{ fontSize: '14px', letterSpacing: '0.06em', color: goldText }}
        >
          {t('tiers.launch_banner')}
        </p>

        {/* SECTION 1 — Три способа (4 tier-карточки) */}
        <section className="mb-20">
          <SectionHead title={t('pricing.section_three_ways')} hint={t('pricing.section_three_ways_hint')} goldText={goldText} />
          <div key={currencyKey} className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {tierDefs.map((def) => (
              <TierCard
                key={def.id}
                eyebrow={t(def.eyebrowKey)}
                title={t(def.titleKey)}
                subtitle={def.subtitleKey ? t(def.subtitleKey) : undefined}
                priceLaunch={t(def.priceLaunchKey)}
                priceLaunchLocal={formatLocal(def.priceUsd)}
                priceWas={t(def.priceWasKey)}
                perks={def.perksKeys.map((k) => t(k))}
                ctaLabel={t(def.ctaKey)}
                onCta={() => openBuy(def)}
                comingSoonNote={def.comingSoonKey ? t(def.comingSoonKey) : undefined}
                accent={def.accentOverride === 'burgundy' ? burgundy : accent}
                fg={fg}
                isDark={isDark}
                cardBg={cardBg}
                cardBorder={cardBorder}
                featured={def.featured}
                premium={def.premium}
              />
            ))}
          </div>
          <p className="italic text-center mt-6 opacity-70" style={{ fontSize: '13px' }}>
            {t('tiers.ladder_hint_topic_vs_session')} · {t('tiers.ladder_hint_all_vs_topic')} · {t('tiers.ladder_hint_x_vs_all')}
          </p>
          <p className="italic text-center mt-2 opacity-60" style={{ fontSize: '12px' }}>
            {t('tiers.launch_banner_grandfather_hint')}
          </p>
        </section>

        {/* SECTION 2 — Что входит в каждую Тему (4 группы) */}
        {cabs !== null && open.length > 0 && (
          <section className="mb-20">
            <SectionHead title={t('pricing.section_groups')} hint={t('pricing.section_groups_hint')} goldText={goldText} />
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {GROUP_DEFS.map((g) => {
                const cabsInGroup = open.filter((c) => g.slugs.includes(c.slug))
                if (cabsInGroup.length === 0) return null
                return (
                  <div
                    key={g.id}
                    className="rounded-md p-5"
                    style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                  >
                    <p className="italic mb-3 opacity-65" style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: goldText }}>
                      {t(`landing.${g.eyebrowKey}`)}
                    </p>
                    <ul className="space-y-2" style={{ fontSize: '14px', listStyle: 'none', paddingLeft: 0 }}>
                      {cabsInGroup.map((c) => (
                        <li key={c.slug} className="italic">
                          — {t(`cabinets_catalog.${c.slug}.name`, { defaultValue: c.name })}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* SECTION 3 — Все 13 кабинетов как разовые ($9) */}
        {cabs !== null && open.length > 0 && (
          <section id="sessions" className="mb-20">
            <SectionHead title={t('pricing.section_sessions_title')} hint={t('pricing.section_sessions_hint')} goldText={goldText} />
            <div key={currencyKey} className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {open.map(renderCard)}
            </div>
          </section>
        )}

        {/* SECTION 4 — Закрытые (по личному согласованию) */}
        {cabs !== null && closed.length > 0 && (
          <section className="mb-12">
            <SectionHead title={t('pricing.section_closed')} hint={t('pricing.section_closed_hint')} goldText={goldText} />
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {closed.map(renderCard)}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-16 mb-12">
          <h2
            className="italic mb-6 text-center"
            style={{ fontSize: '14px', letterSpacing: '0.3em', textTransform: 'uppercase', color: goldText }}
          >
            {t('pricing.faq_title')}
          </h2>
          <div className="space-y-6 max-w-2xl mx-auto">
            <FaqItem q={t('pricing.faq_q_change_date')} a={t('pricing.faq_a_change_date')} />
            <FaqItem q={t('pricing.faq_q_voice')} a={t('pricing.faq_a_voice')} />
            <FaqItem q={t('pricing.faq_q_topic_choice')} a={t('pricing.faq_a_topic_choice')} />
            <FaqItem q={t('pricing.faq_q_x_vs_all')} a={t('pricing.faq_a_x_vs_all')} />
            <FaqItem q={t('pricing.faq_q_video')} a={t('pricing.faq_a_video')} />
            <FaqItem q={t('pricing.faq_q_family')} a={t('pricing.faq_a_family')} />
          </div>
        </section>

        {/* Footnotes */}
        <div className="text-center mt-16 opacity-60 italic" style={{ fontSize: '13px', lineHeight: 1.7 }}>
          <p>{t('pricing.free_for_family_note')}</p>
          <p className="mt-2">{t('pricing.footnote')}</p>
          {currency && currency !== 'USD' && (
            <p className="mt-2">
              {t('pricing.local_rate_note', {
                currency: CURRENCIES[currency].code,
                rate: CURRENCIES[currency].rate.toLocaleString('en-US', { maximumFractionDigits: 2 }),
              })}
            </p>
          )}
          <p className="mt-2">
            {t('pricing.refund_link_prefix')}{' '}
            <a
              href="/refund"
              style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              /refund
            </a>
          </p>
          <p className="mt-4">
            {t('pricing.house_support_note')}{' '}
            <a
              href="https://groznov.net/support"
              style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              groznov.net/support
            </a>
          </p>
          <p className="mt-6">
            <a href="/" style={{ color: 'inherit' }}>{t('pricing.back_to_landing')}</a>
          </p>
        </div>
      </main>

      {buyTarget && (
        <BuyModal
          target={buyTarget}
          open={true}
          onClose={() => setBuyTarget(null)}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// ---------- Helpers ----------

interface SectionHeadProps {
  title: string
  hint: string
  goldText: string
}

function SectionHead({ title, hint, goldText }: SectionHeadProps): React.ReactElement {
  return (
    <>
      <h2
        className="italic text-center mb-2"
        style={{ fontSize: '14px', letterSpacing: '0.3em', textTransform: 'uppercase', color: goldText }}
      >
        {title}
      </h2>
      <p className="italic text-center mb-8 opacity-75" style={{ fontSize: '14px' }}>{hint}</p>
    </>
  )
}

interface TierCardProps {
  eyebrow: string
  title: string
  subtitle?: string
  priceLaunch: string
  priceLaunchLocal: string  // Орієнтовна вартість у локальній валюті ('' якщо USD-only)
  priceWas: string
  perks: string[]
  ctaLabel: string
  onCta: () => void
  comingSoonNote?: string
  accent: string
  fg: string
  isDark: boolean
  cardBg: string
  cardBorder: string
  featured?: boolean
  premium?: boolean   // X-tier: бордюр бургунді + більший
}

function TierCard(p: TierCardProps): React.ReactElement {
  const borderColor = p.premium || p.featured ? p.accent : p.cardBorder
  const borderWidth = p.premium ? '2px' : p.featured ? '2px' : '1px'
  return (
    <div
      className="rounded-md p-6 relative"
      style={{
        backgroundColor: p.cardBg,
        border: `${borderWidth} solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <p className="italic mb-1 opacity-70" style={{ fontSize: '11px', letterSpacing: '0.3em' }}>
        {p.eyebrow}
      </p>
      <h3 className="italic mb-1" style={{ fontSize: '22px', letterSpacing: '0.03em' }}>{p.title}</h3>
      {p.subtitle && (
        <p className="italic opacity-65 mb-2" style={{ fontSize: '13px', lineHeight: 1.4 }}>
          {p.subtitle}
        </p>
      )}
      <div className="mb-1" style={{ fontSize: '26px', letterSpacing: '0.02em' }}>{p.priceLaunch}</div>
      {p.priceLaunchLocal && (
        <div className="opacity-65 mb-1" style={{ fontSize: '13px' }}>{p.priceLaunchLocal}</div>
      )}
      <div className="italic opacity-55 mb-4" style={{ fontSize: '12px' }}>{p.priceWas}</div>
      <ul className="space-y-2 mb-5" style={{ fontSize: '14px', listStyle: 'none', paddingLeft: 0 }}>
        {p.perks.map((perk, i) => (
          <li key={i} className="italic opacity-85">— {perk}</li>
        ))}
      </ul>
      {p.comingSoonNote && (
        <p className="italic mb-4 opacity-65" style={{ fontSize: '12px', lineHeight: 1.5 }}>
          {p.comingSoonNote}
        </p>
      )}
      <button
        type="button"
        onClick={p.onCta}
        className="italic text-center"
        style={{
          marginTop: 'auto',
          alignSelf: 'stretch',
          padding: '12px 24px',
          fontSize: '14px',
          backgroundColor: p.accent,
          color: p.isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          border: `1px solid ${p.accent}`,
          borderRadius: '6px',
          letterSpacing: '0.08em',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {p.ctaLabel}
      </button>
    </div>
  )
}

interface FaqItemProps { q: string; a: string }
function FaqItem({ q, a }: FaqItemProps): React.ReactElement {
  return (
    <details className="border-t pt-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      <summary className="italic cursor-pointer" style={{ fontSize: '15px', letterSpacing: '0.02em' }}>
        {q}
      </summary>
      <p className="italic opacity-80 mt-3 pl-4" style={{ fontSize: '14px', lineHeight: 1.7 }}>{a}</p>
    </details>
  )
}

// Групи кабінетів для секції «Що входить у кожну Тему».
// Slug-перерахування повторює 4 культурні групи з ru/uk landing блоку.
const GROUP_DEFS: { id: string; eyebrowKey: string; slugs: string[] }[] = [
  { id: 'stars_numbers',  eyebrowKey: 'cab_group_stars',         slugs: ['astrology', 'natal_charts', 'horoscopes', 'numerology'] },
  { id: 'soul_body',      eyebrowKey: 'cab_group_soul_body',     slugs: ['psychology', 'body_reading', 'physiognomy', 'palmistry'] },
  { id: 'dream_meaning',  eyebrowKey: 'cab_group_dream_meaning', slugs: ['dream_book', 'esoteric'] },
  { id: 'life_relations', eyebrowKey: 'cab_group_life_relations', slugs: ['career', 'couples', 'parenting'] },
]
