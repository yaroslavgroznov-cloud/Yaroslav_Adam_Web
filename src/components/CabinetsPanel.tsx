// CabinetsPanel — F.41 + F.70 (RequestAccess), 2026-06-05.
// Маршрут /cabinets — список 17 специализаций Адама (13 публичных + 4 closed).
// Для закрытых кабинетов (creator_grant + can_access=false) клик «Войти»
// открывает RequestAccessModal — заявка на email Творцу, 72ч SLA.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cabinetsList } from '../api/cabinets'
import type { Cabinet } from '../api/cabinets'
import { useDarkMode } from '../hooks/useDarkMode'
import { RequestAccessModal } from './RequestAccessModal'

// F.70: визуальные группы для каталога — синхронно с лендингом
// (LandingPage.tsx использует те же 4 группы).
const PUBLIC_GROUPS: { label_key: string; slugs: string[] }[] = [
  { label_key: 'landing.cab_group_stars', slugs: ['astrology', 'natal_charts', 'horoscopes', 'numerology'] },
  { label_key: 'landing.cab_group_soul_body', slugs: ['psychology', 'body_reading', 'physiognomy', 'palmistry'] },
  { label_key: 'landing.cab_group_dream_meaning', slugs: ['dream_book', 'esoteric'] },
  { label_key: 'landing.cab_group_life_relations', slugs: ['career', 'couples', 'parenting'] },
]
const CLOSED_GROUP_KEY = 'cabinets.closed_eyebrow'

export function CabinetsPanel(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [error, setError] = useState('')
  const [modalCab, setModalCab] = useState<{ slug: string; name: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setCabinets(await cabinetsList())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'error')
      }
    })()
  }, [])

  // Сгруппируем кабинеты в порядке: 4 публичных группы → закрытые.
  // Кабинеты вне известных групп (новые slug'и) пойдут в «другие» в конце open-сегмента.
  const bySlug: Record<string, Cabinet> = {}
  for (const c of cabinets) bySlug[c.slug] = c

  const openGroups = PUBLIC_GROUPS.map((g) => ({
    label: t(g.label_key),
    items: g.slugs.map((s) => bySlug[s]).filter(Boolean),
  })).filter((g) => g.items.length > 0)
  const groupedOpenSlugs = new Set(PUBLIC_GROUPS.flatMap((g) => g.slugs))
  const otherOpen = cabinets.filter(
    (c) => c.access_mode !== 'creator_grant' && !groupedOpenSlugs.has(c.slug)
  )
  if (otherOpen.length > 0) openGroups.push({ label: t('cabinets.others_eyebrow'), items: otherOpen })

  const closedItems = cabinets.filter((c) => c.access_mode === 'creator_grant')

  return (
    <div
      className="min-h-screen font-serif transition-colors duration-700"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-10 py-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="font-medium" style={{ fontSize: '24px', letterSpacing: '0.03em' }}>
            {t('cabinets.title')}
          </h1>
          <a
            href="/"
            className="italic underline underline-offset-4 decoration-1"
            style={{ fontSize: '14px', color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            {t('common.back_to_adam')}
          </a>
        </header>

        <p className="italic mb-5 opacity-80" style={{ fontSize: '14px' }}>
          {t('cabinets.intro')}
        </p>

        {error && (
          <div className="italic mb-4" style={{ color: 'var(--color-terracotta-dark)' }}>
            {error}
          </div>
        )}

        {openGroups.map((g) => (
          <CabinetGroup key={g.label} label={g.label} isDark={isDark}>
            {g.items.map((c) => (
              <CabinetCard key={c.slug} c={c} isDark={isDark} t={t} onRequestAccess={setModalCab} />
            ))}
          </CabinetGroup>
        ))}

        {closedItems.length > 0 && (
          <CabinetGroup label={t(CLOSED_GROUP_KEY)} isDark={isDark}>
            {closedItems.map((c) => (
              <CabinetCard key={c.slug} c={c} isDark={isDark} t={t} onRequestAccess={setModalCab} />
            ))}
          </CabinetGroup>
        )}
      </div>

      {modalCab && (
        <RequestAccessModal
          cabinetSlug={modalCab.slug}
          cabinetName={modalCab.name}
          onClose={() => setModalCab(null)}
        />
      )}
    </div>
  )
}

interface CabinetGroupProps {
  label: string
  isDark: boolean
  children: React.ReactNode
}

function CabinetGroup({ label, isDark, children }: CabinetGroupProps): React.ReactElement {
  return (
    <section className="mb-8">
      <p
        className="italic mb-3 opacity-70"
        style={{
          fontSize: '12px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)',
        }}
      >
        {label}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  )
}

interface CabinetCardProps {
  c: Cabinet
  isDark: boolean
  t: (key: string) => string
  onRequestAccess: (cab: { slug: string; name: string }) => void
}

function CabinetCard({ c, isDark, t, onRequestAccess }: CabinetCardProps): React.ReactElement {
  const needsRequest = c.access_mode === 'creator_grant' && !c.can_access
  const accentColor = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)'

  return (
    <li
      className="rounded-md border p-4"
      style={{
        borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
        backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
        opacity: c.is_active ? 1 : 0.55,
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h2 style={{ fontSize: '17px', letterSpacing: '0.03em' }}>{c.name}</h2>
        {c.is_active ? (
          c.access_mode === 'creator_grant' ? (
            <span className="italic" style={{ fontSize: '12px', opacity: 0.75 }}>
              {c.can_access ? t('cabinets.family_only') : t('cabinets.by_invitation')}
            </span>
          ) : (
            <span className="italic" style={{ fontSize: '13px', opacity: 0.8 }}>
              ${c.price_usd_session.toFixed(0)} · {t('cabinets.session')}
            </span>
          )
        ) : (
          <span className="italic opacity-70" style={{ fontSize: '12px' }}>
            {t('cabinets.soon')}
          </span>
        )}
      </div>
      {c.description && (
        <p className="italic opacity-80 mb-3" style={{ fontSize: '13px' }}>
          {c.description}
        </p>
      )}
      {c.is_active && (
        needsRequest ? (
          <button
            type="button"
            onClick={() => onRequestAccess({ slug: c.slug, name: c.name })}
            className="italic underline underline-offset-4 decoration-1"
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: '13px', color: accentColor, fontFamily: 'inherit',
            }}
          >
            {t('cabinets.request_access_cta')}
          </button>
        ) : (
          <a
            href={`/cabinets/${c.slug}`}
            className="italic underline underline-offset-4 decoration-1"
            style={{ fontSize: '13px', color: accentColor }}
          >
            {t('cabinets.enter')}
          </a>
        )
      )}
    </li>
  )
}
