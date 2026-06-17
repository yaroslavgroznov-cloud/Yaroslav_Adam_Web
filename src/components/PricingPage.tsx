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
  // Brand Kit v1.3 (2026-06-09): см. LandingPage — gold для текста
  // выгорает на пергаменте, используем deep antique gold для eyebrow.
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  // goldText — для eyebrow/ссылок на пергаменте (deep antique gold).
  // Декоративный gold в PricingPage пока не используется — PageFrame
  // тянет переменные напрямую из CSS.
  const goldText = isDark
    ? 'var(--color-house-gold-deep-dark)'
    : 'var(--color-house-gold-deep)'
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
    // 2026-06-10: каталог приходит с API на русском. Override через i18n с fallback
    // на API name/description, чтобы прежний контракт не ломался при добавлении
    // нового slug, не описанного в локали.
    const localizedName = t(`cabinets_catalog.${c.slug}.name`, { defaultValue: c.name })
    const localizedDesc = t(`cabinets_catalog.${c.slug}.description`, { defaultValue: c.description ?? '' })
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

        {/* SECTION 1 — Три способа (3 tier-карточки) */}
        <section className="mb-20">
          <SectionHead title={t('pricing.section_three_ways')} hint={t('pricing.section_three_ways_hint')} goldText={goldText} />
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <TierCard
              eyebrow={t('tiers.session_eyebrow')}
              title={t('tiers.session_title')}
              priceLaunch={t('tiers.session_price_launch')}
              priceWas={t('tiers.session_price_was')}
              perks={[t('tiers.session_perks_l1'), t('tiers.session_perks_l2'), t('tiers.session_perks_l3')]}
              ctaLabel={t('tiers.session_cta')}
              ctaHref="#sessions"
              accent={accent}
              fg={fg}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
            <TierCard
              eyebrow={t('tiers.topic_eyebrow')}
              title={t('tiers.topic_title')}
              priceLaunch={t('tiers.topic_price_launch')}
              priceWas={t('tiers.topic_price_was')}
              perks={[t('tiers.topic_perks_l1'), t('tiers.topic_perks_l2'), t('tiers.topic_perks_l3')]}
              ctaLabel={t('tiers.topic_cta')}
              ctaHref={ALL_ACCESS_HREF}
              comingSoonNote={t('tiers.topic_coming_soon_note')}
              accent={accent}
              fg={fg}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
            <TierCard
              eyebrow={t('tiers.all_eyebrow')}
              title={t('tiers.all_title')}
              priceLaunch={t('tiers.all_price_launch')}
              priceWas={t('tiers.all_price_was')}
              perks={[t('tiers.all_perks_l1'), t('tiers.all_perks_l2'), t('tiers.all_perks_l3')]}
              ctaLabel={t('tiers.all_cta')}
              ctaHref={ALL_ACCESS_HREF}
              accent={accent}
              fg={fg}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              featured
            />
            <TierCard
              eyebrow={t('tiers.x_eyebrow')}
              title={t('tiers.x_title')}
              subtitle={t('tiers.x_subtitle')}
              priceLaunch={t('tiers.x_price_launch')}
              priceWas={t('tiers.x_price_was')}
              perks={[
                t('tiers.x_perks_l1'),
                t('tiers.x_perks_l2'),
                t('tiers.x_perks_l3'),
                t('tiers.x_perks_l4'),
                t('tiers.x_perks_l5'),
              ]}
              ctaLabel={t('tiers.x_cta')}
              ctaHref="/chat?subscribe=x_tier"
              accent={burgundy}
              fg={fg}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              premium
            />
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
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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
  priceWas: string
  perks: string[]
  ctaLabel: string
  ctaHref: string
  comingSoonNote?: string
  accent: string
  fg: string
  isDark: boolean
  cardBg: string
  cardBorder: string
  featured?: boolean
  premium?: boolean   // X-tier: бордюр бургунди + крупнее
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
      <a
        href={p.ctaHref}
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
          textDecoration: 'none',
        }}
      >
        {p.ctaLabel}
      </a>
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

// Группы кабинетов для секции «Что входит в каждую Тему».
// Slug-перечисление повторяет 4 культурные группы из ru/uk landing блока.
const GROUP_DEFS: { id: string; eyebrowKey: string; slugs: string[] }[] = [
  { id: 'stars_numbers',  eyebrowKey: 'cab_group_stars',         slugs: ['astrology', 'natal_charts', 'horoscopes', 'numerology'] },
  { id: 'soul_body',      eyebrowKey: 'cab_group_soul_body',     slugs: ['psychology', 'body_reading', 'physiognomy', 'palmistry'] },
  { id: 'dream_meaning',  eyebrowKey: 'cab_group_dream_meaning', slugs: ['dream_book', 'esoteric'] },
  { id: 'life_relations', eyebrowKey: 'cab_group_life_relations', slugs: ['career', 'couples', 'parenting'] },
]
