// PWA install hint для iOS Safari — F.10.P6, 2026-05-25.
// Один раз показываем мягкий баннер: «Добавь Адама на главный экран,
// чтобы получать push и открывать одним тапом».
// Кэшируется в localStorage чтобы не показывался повторно.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const HINT_DISMISSED_KEY = 'ios-install-hint-dismissed'

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
}

interface Props {
  isDark: boolean
}

export function IosInstallHint({ isDark }: Props): React.ReactElement | null {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isIOS()) return
    if (isStandalone()) return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(HINT_DISMISSED_KEY)) return
    // Чуть отложим показ, чтобы не дёргать сразу при загрузке
    const id = window.setTimeout(() => setVisible(true), 2000)
    return () => window.clearTimeout(id)
  }, [])

  if (!visible) return null

  function dismiss(): void {
    try { window.localStorage.setItem(HINT_DISMISSED_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  return (
    <div
      className="shrink-0 px-4 sm:px-10 py-3 border-b flex items-start gap-3"
      style={{
        borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
        backgroundColor: isDark ? 'rgba(168,140,95,0.15)' : 'rgba(168,140,95,0.10)',
      }}
    >
      <span style={{
        fontSize: '20px',
        color: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
        marginTop: '-2px',
      }}>↗</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '14px', lineHeight: '1.4' }}
           dangerouslySetInnerHTML={{ __html: t('iosHint.body') }} />
      </div>
      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        className="shrink-0"
        style={{
          width: 32, height: 32,
          color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
          opacity: 0.7,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
