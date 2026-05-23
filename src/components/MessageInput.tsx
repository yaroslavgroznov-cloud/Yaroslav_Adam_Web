// Поле ввода + кнопка отправки. Enter — отправить, Shift+Enter — перенос строки.
// Sprint C, 2026-05-23.
import React, { useRef, useState } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

const MAX_LEN = 4000

export function MessageInput({ onSend, disabled }: MessageInputProps): React.ReactElement {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const send = (): void => {
    const t = value.trim()
    if (!t || disabled) return
    onSend(t)
    setValue('')
    ref.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const remaining = MAX_LEN - value.length

  return (
    <div
      className="p-3 border-t"
      style={{
        backgroundColor: 'var(--color-cream-50)',
        borderColor: 'var(--color-cream-300)',
      }}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={handleKey}
          placeholder="Спроси Адама…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-2xl px-4 py-2 text-[15px] leading-snug bg-white disabled:opacity-60"
          style={{
            border: '1px solid var(--color-cream-300)',
            color: 'var(--color-pine-900)',
            maxHeight: '140px',
            minHeight: '40px',
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !value.trim()}
          className="rounded-full px-4 py-2 text-sm font-medium text-cream-50 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-terracotta-500)' }}
          aria-label="Отправить"
        >
          Отправить
        </button>
      </div>
      {remaining < 200 && (
        <div className="text-[10px] mt-1 text-right" style={{ color: 'var(--color-pine-300)' }}>
          осталось {remaining} символов
        </div>
      )}
    </div>
  )
}
