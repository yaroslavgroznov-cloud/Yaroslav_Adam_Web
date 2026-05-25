// LanguageSwitcher — модалка выбора языка интерфейса. F.13, 2026-05-26.
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import i18n, { LANGUAGES, STORAGE_KEY } from '../i18n'

interface Props {
  isDark: boolean
  onClose: () => void
}

export function LanguageSwitcher({ isDark, onClose }: Props): React.ReactElement {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string>(i18n.language || 'ru')
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function apply(code: string): void {
    setSelected(code)
    void i18n.changeLanguage(code)
    try { window.localStorage.setItem(STORAGE_KEY, code) } catch { /* ignore */ }
    // Чуть подождать чтобы юзер увидел галочку, потом закрыть
    setTimeout(onClose, 200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        ref={wrapRef}
        className="w-full max-w-md rounded-md border p-5 sm:p-6 font-serif"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: 'var(--font-serif)',
          backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '20px', letterSpacing: '0.04em' }}>
            {t('languageSwitcher.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="opacity-70 hover:opacity-100"
            style={{ color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ul className="grid gap-1">
          {LANGUAGES.map((lang) => {
            const active = selected === lang.code
            return (
              <li key={lang.code}>
                <button
                  onClick={() => apply(lang.code)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: active
                      ? (isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)')
                      : 'transparent',
                    borderColor: active
                      ? 'var(--color-terracotta-dark)'
                      : 'transparent',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{lang.nativeName}</span>
                  <span className="italic opacity-60" style={{ fontSize: '12px' }}>
                    {lang.code}
                  </span>
                  {active && (
                    <span style={{
                      color: 'var(--color-terracotta-dark)',
                      fontSize: '14px', marginLeft: '8px',
                    }}>✓</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
