// Индикатор «Адам печатает» — три анимированные точки.
// Sprint C, 2026-05-23.
import React from 'react'
import { Avatar } from './Avatar'

export function TypingIndicator(): React.ReactElement {
  return (
    <div className="flex items-end gap-2 px-4 py-2">
      <Avatar size={32} />
      <div
        className="flex items-center gap-1 rounded-2xl px-3 py-2"
        style={{ backgroundColor: 'var(--color-cream-200)' }}
        aria-live="polite"
        aria-label="Адам печатает"
      >
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-pine-700" />
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-pine-700" />
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-pine-700" />
      </div>
    </div>
  )
}
