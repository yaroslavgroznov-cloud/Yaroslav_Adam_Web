// Аватар Адама — инициал «А» на терракотовом круге.
// Sprint C, 2026-05-23.
import React from 'react'

interface AvatarProps {
  label?: string  // дефолт «А»
  size?: number   // px
  className?: string
}

export function Avatar({ label = 'А', size = 40, className = '' }: AvatarProps): React.ReactElement {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-cream-50 font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--color-terracotta-500)',
        fontSize: size * 0.42,
        lineHeight: 1,
        boxShadow: 'inset 0 0 0 1px var(--color-terracotta-700)',
      }}
      aria-label={`Аватар ${label}`}
    >
      {label}
    </div>
  )
}
