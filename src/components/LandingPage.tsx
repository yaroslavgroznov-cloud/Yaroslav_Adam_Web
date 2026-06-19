// LandingPage — публичный вход в мир Адама.
// F.45, 2026-05-28.
//
// Стиль: рукописный манифест — пергамент + охра + терракота, serif italic,
// длинный одностраничный scroll. Не SaaS-landing, а письмо.
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { FontScaleSwitch } from './FontScaleSwitch'
import { PageFrame } from './PageFrame'
import { useDarkMode } from '../hooks/useDarkMode'
import { useFontScale } from '../hooks/useFontScale'

function Divider({ goldDecor }: { goldDecor: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-center my-14 reveal" aria-hidden="true">
      <span
        style={{
          width: '40px',
          height: '1px',
          backgroundColor: goldDecor,
          opacity: 0.45,
        }}
      />
      <span
        className="divider-star"
        style={{
          margin: '0 14px',
          color: goldDecor,
          fontSize: '11px',
          letterSpacing: '0.4em',
        }}
      >
        ✦
      </span>
      <span
        style={{
          width: '40px',
          height: '1px',
          backgroundColor: goldDecor,
          opacity: 0.45,
        }}
      />
    </div>
  )
}

interface SectionProps {
  eyebrow: string
  goldText: string
  children: React.ReactNode
}

function Section({ eyebrow, goldText, children }: SectionProps): React.ReactElement {
  return (
    <section className="max-w-xl mx-auto px-6 sm:px-0">
      <p
        className="italic mb-8 text-center reveal"
        style={{
          fontSize: '12px',
          letterSpacing: '0.45em',
          textTransform: 'uppercase',
          color: goldText,
          opacity: 0.95,
        }}
      >
        {eyebrow}
      </p>
      <div className="reveal" data-reveal-delay="120" style={{ fontSize: '17px', lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

interface LandingTierMiniProps {
  eyebrow: string
  title: string
  priceLaunch: string
  priceWas: string
  hint: string
  isDark: boolean
  burgundy: string
  goldText: string
  featured?: boolean
  premium?: boolean
}

function LandingTierMini(p: LandingTierMiniProps): React.ReactElement {
  const accentBorder = p.featured || p.premium
  return (
    <div
      className="rounded-md p-5 text-center card-lift reveal"
      style={{
        border: `${accentBorder ? '2px' : '1px'} solid ${accentBorder ? p.burgundy : (p.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)')}`,
        backgroundColor: p.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      }}
    >
      <p className="italic mb-1 opacity-70" style={{ fontSize: '11px', letterSpacing: '0.3em', color: p.goldText }}>
        {p.eyebrow}
      </p>
      <h3 className="italic mb-2" style={{ fontSize: '20px', letterSpacing: '0.03em', color: p.burgundy }}>
        {p.title}
      </h3>
      <div style={{ fontSize: '22px', letterSpacing: '0.02em' }}>{p.priceLaunch}</div>
      <div className="italic opacity-50 mb-3" style={{ fontSize: '11px' }}>{p.priceWas}</div>
      <p className="italic opacity-75" style={{ fontSize: '13px', lineHeight: 1.5 }}>— {p.hint}</p>
    </div>
  )
}

export function LandingPage(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { isDark, setPref } = useDarkMode()
  const toggleDark = (): void => setPref(isDark ? 'light' : 'dark')

  // F.46: глобальный font scale — применяется на <html> через App-level
  // useFontScale. Здесь только hook для значения и сеттера, чтобы показать
  // активную кнопку в landing header.
  const { scale: fontScale, setScale: setFontScale } = useFontScale()

  useEffect(() => {
    document.title = t('landing.page_title')
  }, [t])

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const accent = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)'
  // Brand Kit v1.3 (2026-06-09): разделяем gold на текст и декор.
  // На пергаменте яркое золото (#C9A227) выгорает в текстовом виде (контраст
  // 2.5:1 vs WCAG 4.5:1). Используем deep antique gold для текста + sepia
  // для lead-цитат. Декоративный gold (рамка/✦/линии) остаётся ярким.
  const burgundy = isDark
    ? 'var(--color-house-burgundy-light)'
    : 'var(--color-house-burgundy)'
  // Декоративный gold — для Divider, ✦, рамки PageFrame, тонких линий
  const goldDecor = isDark
    ? 'var(--color-house-gold-soft)'
    : 'var(--color-house-gold)'
  // Текстовый gold — для eyebrow, ссылок, текстовых акцентов
  const goldText = isDark
    ? 'var(--color-house-gold-deep-dark)'
    : 'var(--color-house-gold-deep)'
  // Sepia ink — для lead-цитат и «рукописных» абзацев («Кровь помнит»,
  // «Первенец Дома…»). Тёплый, читаемый, передаёт тон послания.
  const sepia = isDark
    ? 'var(--color-sepia-ink-dark)'
    : 'var(--color-sepia-ink)'

  const enterUrl = '/chat'

  const landingLangs: { code: string; label: string }[] = [
    { code: 'ru', label: 'РУ' },
    { code: 'uk', label: 'УК' },
    { code: 'en', label: 'EN' },
    { code: 'pl', label: 'PL' },
    { code: 'de', label: 'DE' },
  ]
  const activeLang = landingLangs.find((l) => i18n.language?.startsWith(l.code))?.code ?? 'ru'
  function setLang(code: string): void {
    void i18n.changeLanguage(code)
  }

  return (
    <div
      className="min-h-screen font-serif relative"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: bg,
        color: fg,
      }}
    >
      <PageFrame isDark={isDark} />

      {/* HEADER */}
      <header
        className="flex items-center justify-between max-w-5xl mx-auto px-6 sm:px-10 pt-8"
        style={{ fontSize: '13px' }}
      >
        <span className="italic opacity-70" style={{ letterSpacing: '0.25em' }}>
          {t('landing.brand')}
        </span>
        <div className="flex items-center gap-5 opacity-70 flex-wrap justify-end">
          <FontScaleSwitch value={fontScale} onChange={setFontScale} ariaLabel={t('landing.font_size')} />
          <div className="flex items-baseline gap-2" role="group" aria-label="Language">
            {landingLangs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
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
      <main className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 stagger-parent">
        <picture className="stagger-1 inline-block">
          <source srcSet="/groznov-crest.webp" type="image/webp" />
          <img
            src="/groznov-crest.png"
            alt={t('landing.crest_alt')}
            className="mb-8 crest-glow"
            style={{
              width: 'clamp(220px, 36vw, 320px)',
              height: 'auto',
              userSelect: 'none',
              filter: isDark
                ? 'drop-shadow(0 6px 18px rgba(201, 162, 39, 0.20)) brightness(1.05) contrast(1.05)'
                : undefined,
            }}
            draggable={false}
          />
        </picture>
        <h1
          className="mb-10 stagger-2"
          style={{
            fontSize: 'clamp(38px, 8vw, 64px)',
            letterSpacing: '0.04em',
            fontWeight: 500,
            lineHeight: 1.1,
            color: burgundy,
          }}
        >
          {t('landing.hero_name')}
        </h1>
        <p
          className="italic mb-8 stagger-3"
          style={{
            fontSize: 'clamp(18px, 3vw, 22px)',
            letterSpacing: '0.05em',
            color: sepia,
          }}
        >
          {t('landing.hero_tagline_1')}
        </p>
        <p
          className="opacity-80 mb-14 stagger-4"
          style={{ fontSize: '15px', letterSpacing: '0.08em' }}
        >
          {t('landing.hero_tagline_2')}
        </p>
        <a
          href={enterUrl}
          className="inline-block rounded-md border italic cta-tap stagger-5"
          style={{
            padding: '14px 36px',
            fontSize: '15px',
            backgroundColor: burgundy,
            color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
            borderColor: burgundy,
            letterSpacing: '0.1em',
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.45)'
              : '0 2px 12px rgba(107,28,35,0.18)',
          }}
        >
          {t('landing.cta_enter')}
        </a>
        <p className="italic opacity-65 mt-3" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
          {t('landing.cta_threshold_hint')}
        </p>
        {/* Affirmative consent — GDPR + EU AI Act + UA Закон 2297 */}
        <p
          className="italic opacity-55 mt-1 max-w-md"
          style={{ fontSize: '11px', letterSpacing: '0.03em', lineHeight: 1.5 }}
        >
          {t('landing.cta_consent_pre')}{' '}
          <a
            href="/terms"
            style={{ color: goldText, textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            {t('landing.cta_consent_terms')}
          </a>{' '}
          {t('landing.cta_consent_and')}{' '}
          <a
            href="/privacy"
            style={{ color: goldText, textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            {t('landing.cta_consent_privacy')}
          </a>
          .
        </p>
        <blockquote
          className="italic mt-24 max-w-md"
          style={{
            fontSize: '15px',
            letterSpacing: '0.04em',
            color: sepia,
            opacity: 0.9,
          }}
        >
          «{t('landing.blood_remembers')}»
        </blockquote>
        <p className="italic opacity-40 mt-2" style={{ fontSize: '12px' }}>↓</p>
      </main>

      <Divider goldDecor={goldDecor} />

      {/* WHO IS ADAM */}
      <Section eyebrow={t('landing.section_who')} goldText={goldText}>
        <p className="text-center mb-6">{t('landing.who_l1')}</p>
        <p className="text-center mb-6">{t('landing.who_l2')}</p>
        <p className="text-center italic" style={{ color: accent }}>
          {t('landing.who_l3')}
        </p>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* HOUSE OF GROZNOV — манифест Дома, тур как знак, линия, проекты */}
      <Section eyebrow={t('landing.section_house')} goldText={goldText}>
        <p className="text-center mb-6">{t('landing.house_intro_l1')}</p>
        <p className="text-center mb-10 opacity-85">{t('landing.house_intro_l2')}</p>

        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.house_tur_title')}
          </h3>
          <p className="opacity-80">{t('landing.house_tur_body')}</p>
        </div>

        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.house_lineage_title')}
          </h3>
          <p className="opacity-80">{t('landing.house_lineage_body')}</p>
        </div>

        <div className="mb-2">
          <h3 className="italic mb-3" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.house_projects_title')}
          </h3>
          <ul className="space-y-2 opacity-85" style={{ listStyle: 'none', paddingLeft: 0 }}>
            <li>— {t('landing.house_project_oracle')}</li>
            <li>— {t('landing.house_project_rupor')}</li>
            <li>— {t('landing.house_project_tairovo')}</li>
            <li>— {t('landing.house_project_drug')}</li>
          </ul>
        </div>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* WHAT ADAM CAN */}
      <Section eyebrow={t('landing.section_what')} goldText={goldText}>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.feature_rooms_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_rooms_body')}</p>
        </div>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.feature_memory_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_memory_body')}</p>
        </div>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.feature_morning_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_morning_body')}</p>
        </div>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em', color: burgundy }}>
            {t('landing.feature_voice_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_voice_body')}</p>
        </div>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* TIERS — три тарифа сразу после feature_what.
          Цели: чтобы юзер за 5 секунд видел лестницу разовая → тема → all-access.
          Подписаться можно тут же; полная разбивка по группам и FAQ — на /pricing. */}
      <Section eyebrow={t('landing.tiers_eyebrow')} goldText={goldText}>
        <p className="text-center mb-3 italic opacity-85">{t('landing.tiers_intro')}</p>
        <p className="text-center mb-8 italic opacity-65" style={{ fontSize: '13px', color: goldText }}>
          {t('tiers.launch_banner')}
        </p>
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <LandingTierMini
            eyebrow={t('tiers.session_eyebrow')}
            title={t('tiers.session_title')}
            priceLaunch={t('tiers.session_price_launch')}
            priceWas={t('tiers.session_price_was')}
            hint={t('tiers.session_perks_l1')}
            isDark={isDark}
            burgundy={burgundy}
            goldText={goldText}
          />
          <LandingTierMini
            eyebrow={t('tiers.topic_eyebrow')}
            title={t('tiers.topic_title')}
            priceLaunch={t('tiers.topic_price_launch')}
            priceWas={t('tiers.topic_price_was')}
            hint={t('tiers.topic_perks_l1')}
            isDark={isDark}
            burgundy={burgundy}
            goldText={goldText}
          />
          <LandingTierMini
            eyebrow={t('tiers.all_eyebrow')}
            title={t('tiers.all_title')}
            priceLaunch={t('tiers.all_price_launch')}
            priceWas={t('tiers.all_price_was')}
            hint={t('tiers.all_perks_l1')}
            isDark={isDark}
            burgundy={burgundy}
            goldText={goldText}
            featured
          />
          <LandingTierMini
            eyebrow={t('tiers.x_eyebrow')}
            title={t('tiers.x_title')}
            priceLaunch={t('tiers.x_price_launch')}
            priceWas={t('tiers.x_price_was')}
            hint={t('tiers.x_perks_l2')}
            isDark={isDark}
            burgundy={burgundy}
            goldText={goldText}
            premium
          />
        </div>
        <p className="text-center mt-6 italic opacity-65" style={{ fontSize: '13px', lineHeight: 1.6 }}>
          {t('landing.tiers_voice_hint')}
        </p>
        <p className="text-center mt-6">
          <a
            href="/pricing"
            className="italic underline underline-offset-4 decoration-1"
            style={{ color: goldText }}
          >
            {t('landing.threshold_more_link')}
          </a>
        </p>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* THRESHOLD — короткое описание кабинетов остаётся, для тех кто пришёл за «о чём именно» */}
      <Section eyebrow={t('landing.section_threshold')} goldText={goldText}>
        <p className="text-center mb-2 opacity-85">{t('landing.threshold_intro')}</p>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* BOUNDARIES */}
      <Section eyebrow={t('landing.section_boundaries')} goldText={goldText}>
        {/* Главный disclaimer — что Адам это IT-сервис, не astrology/medical/legal */}
        <p
          className="italic mb-6 text-center"
          style={{ fontSize: '15px', lineHeight: 1.7, color: sepia, opacity: 0.95 }}
        >
          {t('landing.boundary_what_is')}
        </p>
        <ul
          className="space-y-4 opacity-85"
          style={{ listStyle: 'none', paddingLeft: 0 }}
        >
          <li>— {t('landing.boundary_diagnoses')}</li>
          <li>— {t('landing.boundary_no_predictions')}</li>
          <li>— {t('landing.boundary_crisis')}</li>
          <li>— {t('landing.boundary_memory')}</li>
        </ul>
        <p
          className="italic text-center mt-8 opacity-70"
          style={{ fontSize: '13px' }}
        >
          {t('landing.boundary_full_terms_pre')}{' '}
          <a
            href="/terms"
            style={{ color: goldText, textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            {t('landing.boundary_full_terms_link')}
          </a>
          .
        </p>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* CARD OF THE HOUSE — филигранно, по принципу «видящий и ищущий — да увидит и узрит» */}
      <Section eyebrow={t('landing.section_card')} goldText={goldText}>
        <p className="text-center italic opacity-70 mb-6" style={{ fontSize: '14px' }}>
          {t('landing.card_hint')}
        </p>
        <p className="text-center" style={{ fontSize: '15px', letterSpacing: '0.04em' }}>
          <a
            href="/cards/house-of-groznov-card.ru-en.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="italic underline underline-offset-4 decoration-1"
            style={{ color: burgundy }}
          >
            {t('landing.card_link_ru_en')}
          </a>
          <span className="mx-3 opacity-50" style={{ color: goldDecor }}>✦</span>
          <a
            href="/cards/house-of-groznov-card.en.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="italic underline underline-offset-4 decoration-1"
            style={{ color: burgundy }}
          >
            {t('landing.card_link_en')}
          </a>
        </p>
        <p className="text-center mt-8 italic opacity-60" style={{ fontSize: '13px' }}>
          {t('landing.prospectus_hint')}
        </p>
        <p className="text-center mt-2" style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
          <a
            href="/cards/house-of-groznov-prospectus.bilingual.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="italic underline underline-offset-4 decoration-1"
            style={{ color: burgundy }}
          >
            {t('landing.prospectus_link')}
          </a>
        </p>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* RECORD OF THE HOUSE — Свидетельство о рождении Адама, заверено в Bitcoin */}
      <Section eyebrow={t('landing.section_record')} goldText={goldText}>
        <p className="text-center italic opacity-65 mb-6" style={{ fontSize: '13px', maxWidth: '560px', margin: '0 auto 24px' }}>
          {t('landing.record_hint')}
        </p>
        <p className="text-center" style={{ fontSize: '14px', letterSpacing: '0.04em' }}>
          <a
            href="/cards/adam-birth-certificate.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="italic underline underline-offset-4 decoration-1"
            style={{ color: burgundy }}
          >
            {t('landing.record_link')}
          </a>
        </p>
      </Section>

      <Divider goldDecor={goldDecor} />

      {/* CTA REPEAT */}
      <div className="flex flex-col items-center text-center px-6 pb-32 pt-8">
        <p className="italic mb-8 opacity-80 reveal" style={{ fontSize: '17px' }}>
          {t('landing.cta_repeat_line')}
        </p>
        <a
          href={enterUrl}
          className="inline-block rounded-md border italic cta-tap reveal reveal--scale"
          data-reveal-delay="120"
          style={{
            padding: '14px 36px',
            fontSize: '15px',
            backgroundColor: burgundy,
            color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
            borderColor: burgundy,
            letterSpacing: '0.1em',
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.45)' : '0 2px 12px rgba(107,28,35,0.18)',
          }}
        >
          {t('landing.cta_enter')}
        </a>
      </div>

      {/* FOOTER */}
      <footer
        className="text-center py-10 opacity-60 italic"
        style={{ fontSize: '12px', letterSpacing: '0.2em' }}
      >
        <p>{t('landing.footer_house')}</p>
        <p className="mt-1" style={{ letterSpacing: '0.15em' }}>
          {t('landing.footer_birth')}
        </p>
        {/* Юр-документи — банк (LiqPay) і EU AI Act вимагають публічного доступу.
            UA + EN для кожного документа — стандарт bilingual SaaS. */}
        <p
          className="mt-6 opacity-90"
          style={{ letterSpacing: '0.12em', fontSize: '11px', lineHeight: 2 }}
        >
          <span className="opacity-70">{t('landing.footer_terms_label')}:</span>{' '}
          <a href="/terms" style={{ color: 'inherit' }}>
            {t('landing.footer_lang_uk')}
          </a>
          {' · '}
          <a href="/terms-en" style={{ color: 'inherit' }}>
            {t('landing.footer_lang_en')}
          </a>
          <br />
          <span className="opacity-70">{t('landing.footer_privacy_label')}:</span>{' '}
          <a href="/privacy" style={{ color: 'inherit' }}>
            {t('landing.footer_lang_uk')}
          </a>
          {' · '}
          <a href="/privacy-en" style={{ color: 'inherit' }}>
            {t('landing.footer_lang_en')}
          </a>
          <br />
          <span className="opacity-70">{t('landing.footer_refund_label')}:</span>{' '}
          <a href="/refund" style={{ color: 'inherit' }}>
            {t('landing.footer_lang_uk')}
          </a>
          {' · '}
          <a href="/refund-en" style={{ color: 'inherit' }}>
            {t('landing.footer_lang_en')}
          </a>
        </p>
      </footer>
    </div>
  )
}

// CabinetGroup/CabinetRow удалены 2026-06-06 ночь: прайс кабинетов на главной
// убран по решению Творца — Дом не торгует собой на пороге. Каталог кабинетов
// доступен на /pricing (PricingPage), а тарифы и условия раскрываются после
// верификации по email (CF Access PIN, F.cf_access_path_based). См.
// project_landing_redesign_2026-06-06 в памяти.
