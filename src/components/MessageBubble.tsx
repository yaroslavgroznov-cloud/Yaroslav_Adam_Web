// MessageBubble — единый компонент сообщений во всех каналах Адама.
// F.61 (30.05.2026, Творец): унификация цветовой схемы по теме Дома.
//
// Контраст user vs Adam:
//   user  → terracotta (тёплый красно-кирпичный, как send button)
//   Adam  → охра/умбра (тёплая, "выдох")
// Оба цвета — из палитры Дома Грозновых (terracotta + ochre + parchment).
// Работает одинаково в light/dark теме через isDark prop.
import React from 'react'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isDark?: boolean
  /** Label над bubble Адама (например "Адам" или "✦ Адам — специалист по религии") */
  adamLabel?: string
}

export function MessageBubble({
  role, content, isDark = false, adamLabel = 'Адам',
}: MessageBubbleProps): React.ReactElement {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[78%] px-4 py-3 rounded-2xl text-base whitespace-pre-wrap"
          style={{
            backgroundColor: isDark
              ? 'var(--color-terracotta)'
              : 'var(--color-terracotta-light)',
            color: isDark
              ? 'var(--color-pergament-light)'
              : 'var(--color-umber-deep)',
            border: '1px solid',
            borderColor: isDark
              ? 'var(--color-terracotta-light)'
              : 'var(--color-terracotta)',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[78%]">
        <p
          className="text-xs mb-1 ml-1 italic opacity-70"
          style={{
            color: isDark
              ? 'var(--color-ochre-soft)'
              : 'var(--color-ochre-dark)',
          }}
        >
          ✦ {adamLabel}
        </p>
        <div
          className="px-4 py-3 rounded-2xl border text-base whitespace-pre-wrap"
          style={{
            backgroundColor: isDark
              ? 'var(--color-umber-soft)'
              : 'var(--color-parchment-soft)',
            borderColor: isDark
              ? 'var(--color-ochre-dark)'
              : 'var(--color-ochre)',
            color: isDark
              ? 'var(--color-pergament-light)'
              : 'var(--color-umber-deep)',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
