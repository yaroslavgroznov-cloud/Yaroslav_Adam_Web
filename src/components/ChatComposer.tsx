/**
 * ChatComposer — единый компонент ввода для всех каналов Адама.
 *
 * Дизайн-инвариант (по решению Творца 30.05.2026, F.61):
 *   - Enter → новая строка
 *   - Ctrl/Cmd + Enter → отправить
 *   - Цветовая палитра кабинетная (umber/parchment/ochre), а не «белая»
 *
 * Используется в: ChatInterface (общий чат), CabinetSessionPage (кабинет),
 * StolPanel (стол). Один источник истины — баг не может вернуться.
 */
import clsx from 'clsx'
import React, { useRef } from 'react'

export interface ChatComposerProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void | Promise<void>
  placeholder: string
  disabled?: boolean
  isDark: boolean
  /** Высота textarea: 'compact' (~2 строки) или 'roomy' (~3 строки + adjustable) */
  size?: 'compact' | 'roomy'
  /** Аттач-кнопка слева (опционально) */
  attachSlot?: React.ReactNode
  /** Доп. кнопки справа от send (опционально) — например voice */
  trailingSlot?: React.ReactNode
  /** Send button label override (default: t('common.send')) */
  sendLabel: string
}

export function ChatComposer({
  value, onChange, onSend, placeholder, disabled = false,
  isDark, size = 'compact', attachSlot, trailingSlot, sendLabel,
}: ChatComposerProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Ctrl/Cmd+Enter — отправка. Просто Enter — новая строка (кабинетный паттерн).
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!disabled && value.trim().length > 0) {
        void onSend()
      }
    }
  }

  function adjustHeight(): void {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 340)}px`
  }

  const rows = size === 'roomy' ? 3 : 2
  const minHeight = size === 'roomy' ? 'clamp(72px, 14vw, 110px)' : '64px'
  const maxHeight = size === 'roomy' ? 'clamp(180px, 35vh, 340px)' : '30vh'

  return (
    <div className="flex items-end gap-2 w-full">
      {attachSlot}
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(e) => { onChange(e.target.value); adjustHeight() }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'flex-1 min-w-0 rounded-md border outline-none resize-none transition-colors duration-700 ease-in-out disabled:opacity-60',
          isDark ? 'dom-input-dark' : 'dom-input',
        )}
        style={{
          padding: 'clamp(10px, 2vw, 14px) clamp(12px, 2.5vw, 18px)',
          fontSize: 'clamp(15px, 2.5vw, 16px)',
          fontFamily: 'inherit',
          lineHeight: '1.55',
          minHeight,
          maxHeight,
          overflowY: 'auto',
          backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
        }}
      />
      {trailingSlot}
      <button
        type="button"
        onClick={() => void onSend()}
        disabled={disabled || value.trim().length === 0}
        className="shrink-0 inline-flex items-center justify-center rounded-md border italic disabled:opacity-50"
        style={{
          minWidth: 44, height: 44,
          padding: '0 14px',
          fontSize: '14px',
          fontFamily: 'inherit',
          backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
          color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
        }}
      >
        {sendLabel}
      </button>
    </div>
  )
}
