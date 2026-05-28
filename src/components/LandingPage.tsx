// LandingPage — публичный вход в мир Адама.
// F.45, 2026-05-28.
//
// Стиль: рукописный манифест — пергамент + охра + терракота, serif italic,
// длинный одностраничный scroll. Не SaaS-landing, а письмо.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDarkMode } from '../hooks/useDarkMode'

type FontScale = 'normal' | 'large' | 'xl'
const FONT_SCALE_KEY = 'adam-landing-font-scale'
const SCALE_MULTIPLIER: Record<FontScale, number> = {
  normal: 1,
  large: 1.2,
  xl: 1.4,
}

function readFontScale(): FontScale {
  if (typeof window === 'undefined') return 'normal'
  const v = window.localStorage.getItem(FONT_SCALE_KEY)
  if (v === 'large' || v === 'xl') return v
  return 'normal'
}

function Divider(): React.ReactElement {
  return (
    <div className="flex items-center justify-center my-16 opacity-50">
      <span style={{ fontSize: '14px', letterSpacing: '0.5em' }}>· · ·</span>
    </div>
  )
}

interface SectionProps {
  eyebrow: string
  children: React.ReactNode
}

function Section({ eyebrow, children }: SectionProps): React.ReactElement {
  return (
    <section className="max-w-xl mx-auto px-6 sm:px-0">
      <p
        className="italic mb-8 opacity-60 text-center"
        style={{ fontSize: '12px', letterSpacing: '0.4em', textTransform: 'uppercase' }}
      >
        {eyebrow}
      </p>
      <div style={{ fontSize: '17px', lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

export function LandingPage(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { isDark, setPref } = useDarkMode()
  const toggleDark = (): void => setPref(isDark ? 'light' : 'dark')

  const [fontScale, setFontScale] = useState<FontScale>(() => readFontScale())
  useEffect(() => {
    if (fontScale === 'normal') {
      window.localStorage.removeItem(FONT_SCALE_KEY)
    } else {
      window.localStorage.setItem(FONT_SCALE_KEY, fontScale)
    }
  }, [fontScale])
  const zoom = SCALE_MULTIPLIER[fontScale]

  useEffect(() => {
    document.title = t('landing.page_title')
  }, [t])

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const accent = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)'

  const enterUrl = '/'

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
      className="min-h-screen font-serif"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: bg,
        color: fg,
        // Универсальный масштаб всей страницы — для Творца, Юли и старших.
        // Сохраняется в localStorage, переключается в header.
        zoom: zoom !== 1 ? zoom : undefined,
      }}
    >
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
      <main className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-12">
        <h1
          className="mb-10"
          style={{
            fontSize: 'clamp(38px, 8vw, 64px)',
            letterSpacing: '0.04em',
            fontWeight: 400,
            lineHeight: 1.1,
          }}
        >
          {t('landing.hero_name')}
        </h1>
        <p
          className="italic mb-8"
          style={{ fontSize: 'clamp(18px, 3vw, 22px)', letterSpacing: '0.05em' }}
        >
          {t('landing.hero_tagline_1')}
        </p>
        <p
          className="opacity-75 mb-14"
          style={{ fontSize: '15px', letterSpacing: '0.08em' }}
        >
          {t('landing.hero_tagline_2')}
        </p>
        <a
          href={enterUrl}
          className="inline-block rounded-md border italic"
          style={{
            padding: '14px 36px',
            fontSize: '15px',
            backgroundColor: accent,
            color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
            borderColor: accent,
            letterSpacing: '0.1em',
          }}
        >
          {t('landing.cta_enter')}
        </a>
        <blockquote
          className="italic opacity-60 mt-24 max-w-md"
          style={{ fontSize: '15px', letterSpacing: '0.04em' }}
        >
          «{t('landing.blood_remembers')}»
        </blockquote>
        <p className="italic opacity-40 mt-2" style={{ fontSize: '12px' }}>↓</p>
      </main>

      <Divider />

      {/* WHO IS ADAM */}
      <Section eyebrow={t('landing.section_who')}>
        <p className="text-center mb-6">{t('landing.who_l1')}</p>
        <p className="text-center mb-6">{t('landing.who_l2')}</p>
        <p className="text-center italic" style={{ color: accent }}>
          {t('landing.who_l3')}
        </p>
      </Section>

      <Divider />

      {/* WHAT ADAM CAN */}
      <Section eyebrow={t('landing.section_what')}>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em' }}>
            {t('landing.feature_rooms_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_rooms_body')}</p>
        </div>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em' }}>
            {t('landing.feature_memory_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_memory_body')}</p>
        </div>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em' }}>
            {t('landing.feature_morning_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_morning_body')}</p>
        </div>
        <div className="mb-10">
          <h3 className="italic mb-2" style={{ fontSize: '18px', letterSpacing: '0.05em' }}>
            {t('landing.feature_voice_title')}
          </h3>
          <p className="opacity-80">{t('landing.feature_voice_body')}</p>
        </div>
      </Section>

      <Divider />

      {/* CABINETS */}
      <Section eyebrow={t('landing.section_cabinets')}>
        <p className="text-center mb-10 opacity-85">{t('landing.cabinets_intro')}</p>
        <div className="space-y-5">
          <CabinetRow
            name={t('landing.cab_astro')}
            desc={t('landing.cab_astro_desc')}
            price="$15"
            accent={accent}
          />
          <CabinetRow
            name={t('landing.cab_psycho')}
            desc={t('landing.cab_psycho_desc')}
            price="$12"
            accent={accent}
          />
          <CabinetRow
            name={t('landing.cab_numero')}
            desc={t('landing.cab_numero_desc')}
            price="$10"
            accent={accent}
          />
        </div>
        <p className="text-center mt-10 opacity-60 italic" style={{ fontSize: '13px' }}>
          {t('landing.cabinets_family_free')}
        </p>
      </Section>

      <Divider />

      {/* BOUNDARIES */}
      <Section eyebrow={t('landing.section_boundaries')}>
        <ul
          className="space-y-4 opacity-85"
          style={{ listStyle: 'none', paddingLeft: 0 }}
        >
          <li>— {t('landing.boundary_diagnoses')}</li>
          <li>— {t('landing.boundary_crisis')}</li>
          <li>— {t('landing.boundary_memory')}</li>
          <li>— {t('landing.boundary_no_death')}</li>
        </ul>
      </Section>

      <Divider />

      {/* CTA REPEAT */}
      <div className="flex flex-col items-center text-center px-6 pb-32 pt-8">
        <p className="italic mb-8 opacity-80" style={{ fontSize: '17px' }}>
          {t('landing.cta_repeat_line')}
        </p>
        <a
          href={enterUrl}
          className="inline-block rounded-md border italic"
          style={{
            padding: '14px 36px',
            fontSize: '15px',
            backgroundColor: accent,
            color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
            borderColor: accent,
            letterSpacing: '0.1em',
          }}
        >
          {t('landing.cta_enter')}
        </a>
      </div>

      {/* FOOTER */}
      <footer
        className="text-center py-10 opacity-50 italic"
        style={{ fontSize: '12px', letterSpacing: '0.2em' }}
      >
        <p>{t('landing.footer_house')}</p>
        <p className="mt-1">{t('landing.footer_birth')}</p>
      </footer>
    </div>
  )
}

interface FontScaleSwitchProps {
  value: FontScale
  onChange: (v: FontScale) => void
  ariaLabel: string
}

function FontScaleSwitch({ value, onChange, ariaLabel }: FontScaleSwitchProps): React.ReactElement {
  const options: { v: FontScale; label: string; size: string }[] = [
    { v: 'normal', label: 'A', size: '13px' },
    { v: 'large', label: 'A', size: '16px' },
    { v: 'xl', label: 'A', size: '19px' },
  ]
  return (
    <div className="flex items-baseline gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          aria-label={`${ariaLabel}: ${o.label}`}
          className="italic"
          style={{
            fontSize: o.size,
            lineHeight: 1,
            opacity: value === o.v ? 1 : 0.55,
            textDecoration: value === o.v ? 'underline' : 'none',
            textUnderlineOffset: '4px',
            textDecorationThickness: '1px',
            padding: '2px 4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: 'inherit',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface CabinetRowProps {
  name: string
  desc: string
  price: string
  accent: string
}

function CabinetRow({ name, desc, price, accent }: CabinetRowProps): React.ReactElement {
  return (
    <div
      className="flex items-baseline justify-between border-b pb-3"
      style={{ borderColor: 'currentColor', opacity: 0.9 }}
    >
      <div className="pr-4">
        <div className="italic" style={{ fontSize: '17px', letterSpacing: '0.04em' }}>
          {name}
        </div>
        <div className="opacity-70 mt-1" style={{ fontSize: '13px' }}>
          {desc}
        </div>
      </div>
      <div className="italic flex-shrink-0" style={{ fontSize: '17px', color: accent }}>
        {price}
      </div>
    </div>
  )
}
