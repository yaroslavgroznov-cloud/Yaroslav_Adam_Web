// Header overflow ••• menu — F.10.P1, 2026-05-25.
// Сжимает редкие кнопки в выпадающий dropdown, чтобы header не пухнул.
import React, { useEffect, useRef, useState } from 'react'

export interface OverflowItem {
  key: string
  label: string
  href?: string         // если href — обычная ссылка
  onClick?: () => void  // или клик
  disabled?: boolean
  badge?: 'frozen' | 'active' | null  // мини-индикатор справа
  icon: React.ReactElement
}

interface Props {
  isDark: boolean
  items: OverflowItem[]
}

export function HeaderOverflowMenu({ isDark, items }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iconBtnStyle: React.CSSProperties = {
    width: 36, height: 36,
    color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
    opacity: 0.7,
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 inline-flex items-center justify-center rounded-md hover:opacity-100 transition-colors"
        style={iconBtnStyle}
        aria-label="Ещё"
        aria-haspopup="true"
        aria-expanded={open}
        title="Ещё"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-md border shadow-lg z-50"
          style={{
            minWidth: 220,
            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          }}
        >
          <ul className="py-1">
            {items.map((item) => {
              const content = (
                <span className="flex items-center gap-3 px-4 py-2 w-full">
                  <span style={{
                    color: item.badge === 'frozen'
                      ? 'var(--color-terracotta-dark)'
                      : item.badge === 'active'
                        ? (isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)')
                        : (isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'),
                    display: 'inline-flex',
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: '14px', flex: 1 }}>{item.label}</span>
                  {item.badge === 'frozen' && (
                    <span className="text-xs italic" style={{ color: 'var(--color-terracotta-dark)' }}>
                      ●
                    </span>
                  )}
                  {item.badge === 'active' && (
                    <span className="text-xs italic" style={{ color: 'var(--color-terracotta)' }}>
                      ✓
                    </span>
                  )}
                </span>
              )
              if (item.href) {
                return (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      className="block hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </a>
                  </li>
                )
              }
              return (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      if (item.disabled) return
                      item.onClick?.()
                      setOpen(false)
                    }}
                    disabled={item.disabled}
                    className="block w-full text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {content}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
