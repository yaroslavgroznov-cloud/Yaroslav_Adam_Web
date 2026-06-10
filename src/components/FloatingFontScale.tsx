// FloatingFontScale — плавающий виджет масштаба шрифта.
// F.46, 2026-05-28.
//
// Маленькая фиксированная кнопка «А» в правом нижнем углу. Клик
// раскрывает три варианта A / A+ / A++. Применяется ко всему SPA
// через useFontScale (родительский hook на App уровне).
//
// На /welcome НЕ показывается — там есть inline-переключатель в header.
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FontScaleSwitch } from './FontScaleSwitch'
import { useFontScale } from '../hooks/useFontScale'

export function FloatingFontScale(): React.ReactElement | null {
  const { t } = useTranslation()
  const { scale, setScale } = useFontScale()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 40,
        // Compensate for outer page zoom — virtual size остаётся компактным
        // независимо от выбранного масштаба.
      }}
    >
      {open && (
        <div
          className="rounded-md border mb-2 px-3 py-2 italic shadow-md"
          style={{
            fontFamily: 'var(--font-serif)',
            backgroundColor: 'var(--color-parchment, #f3e9d2)',
            color: 'var(--color-umber, #4a3a26)',
            borderColor: 'var(--color-ochre, #c89968)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ opacity: 0.6, letterSpacing: '0.2em', fontSize: '10px' }}>
            {t('fontScale.size_short')}
          </span>
          <FontScaleSwitch
            value={scale}
            onChange={(s) => { setScale(s); setOpen(false) }}
            ariaLabel={t('fontScale.aria_label')}
          />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('fontScale.aria_label')}
        title={t('fontScale.title')}
        className="italic rounded-full border"
        style={{
          width: 36,
          height: 36,
          fontFamily: 'var(--font-serif)',
          backgroundColor: 'var(--color-parchment, #f3e9d2)',
          color: 'var(--color-umber, #4a3a26)',
          borderColor: 'var(--color-ochre, #c89968)',
          fontSize: scale === 'xl' ? '20px' : scale === 'large' ? '17px' : '14px',
          cursor: 'pointer',
          opacity: 0.85,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          padding: 0,
          lineHeight: 1,
        }}
      >
        A
      </button>
    </div>
  )
}
