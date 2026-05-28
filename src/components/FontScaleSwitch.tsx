// FontScaleSwitch — общий переключатель размера шрифта A / A+ / A++.
// F.46, 2026-05-28.
//
// 3 кнопки «A» разного размера. Активная подчёркнута и полностью непрозрачна,
// остальные на 55% opacity. Без иконок — буква «А» сама показывает размер.
import React from 'react'

import type { FontScale } from '../hooks/useFontScale'

export interface FontScaleSwitchProps {
  value: FontScale
  onChange: (v: FontScale) => void
  ariaLabel?: string
  // compact — для тесных хедеров (chat / panels). Базовые размеры чуть меньше.
  compact?: boolean
}

export function FontScaleSwitch({
  value, onChange, ariaLabel = 'font size', compact = false,
}: FontScaleSwitchProps): React.ReactElement {
  const sizes = compact
    ? ['11px', '14px', '17px']
    : ['13px', '16px', '19px']
  const options: { v: FontScale; size: string }[] = [
    { v: 'normal', size: sizes[0] },
    { v: 'large',  size: sizes[1] },
    { v: 'xl',     size: sizes[2] },
  ]
  return (
    <div className="flex items-baseline gap-1" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          aria-label={`${ariaLabel}: ${o.v}`}
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
          A
        </button>
      ))}
    </div>
  )
}
