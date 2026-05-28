// CabinetsPanel — F.41, 2026-05-28.
// Маршрут /cabinets — список 9 специализаций Адама. Семья видит free_family
// бейдж, остальные — цены и кнопку «Войти».
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cabinetsList } from '../api/cabinets'
import type { Cabinet } from '../api/cabinets'
import { useDarkMode } from '../hooks/useDarkMode'

export function CabinetsPanel(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setCabinets(await cabinetsList())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'error')
      }
    })()
  }, [])

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

        <ul className="grid gap-3 sm:grid-cols-2">
          {cabinets.map((c) => (
            <li
              key={c.slug}
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
                      {t('cabinets.family_only')}
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
                <a
                  href={`/cabinets/${c.slug}`}
                  className="italic underline underline-offset-4 decoration-1"
                  style={{ fontSize: '13px', color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta-dark)' }}
                >
                  {t('cabinets.enter')}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
