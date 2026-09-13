// MessageBubble — единый компонент сообщений во всех каналах Адама.
// F.61 (30.05.2026, Творец): унификация цветовой схемы по теме Дома.
//
// Контраст user vs Adam:
//   user  → terracotta (тёплый красно-кирпичный, как send button)
//   Adam  → охра/умбра (тёплая, "выдох")
// Оба цвета — из палитры Дома Грозновых (terracotta + ochre + parchment).
// Работает одинаково в light/dark теме через isDark prop.
import React from 'react'

import type { MessageAttachment } from '../types'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isDark?: boolean
  /** Label над bubble Адама (например "Адам" или "✦ Адам — специалист по религии") */
  adamLabel?: string
  /** L0 самообучения: id ответа Адама (для 👍/👎). Если нет — кнопки не рисуем. */
  messageId?: string
  /** Текущая оценка (1 = 👍, -1 = 👎, null/undefined = нет). */
  feedback?: 1 | -1 | null
  /** Клик по 👍/👎. rating: 1 или -1 (повторный клик по активному — снимает). */
  onFeedback?: (messageId: string, rating: 1 | -1) => void
  /** 13.09.2026: файлы, прикреплённые К ЭТОМУ сообщению. Показываются внутри
   *  пузыря и НЕ исчезают после отправки — слово Творца. */
  attachments?: MessageAttachment[]
}

/** Чипы вложений внутри пузыря. Картинка — превью, прочее — имя файла.
 *  Ссылка открывается только если бэкенд отдал public_url; иначе чип немой,
 *  но видимый: пропасть из диалога он не должен в любом случае. */
function AttachmentChips(
  { items, isDark }: { items: MessageAttachment[]; isDark: boolean },
): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {items.map((a) => {
        const chip = (
          <span
            className="italic rounded-md border inline-flex items-center gap-1.5"
            style={{
              fontSize: '12px',
              padding: '3px 8px',
              maxWidth: '220px',
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'rgba(168,140,95,0.18)' : 'rgba(168,140,95,0.12)',
            }}
            title={a.original_name}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.is_image ? '🖼' : '📎'} {a.original_name}
            </span>
          </span>
        )
        if (a.is_image && a.public_url) {
          return (
            <a key={a.id} href={a.public_url} target="_blank" rel="noreferrer"
               className="block" style={{ lineHeight: 0 }}>
              <img
                src={a.public_url}
                alt={a.original_name}
                className="rounded-md border object-cover"
                style={{
                  maxWidth: 160, maxHeight: 160,
                  borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                }}
              />
            </a>
          )
        }
        return a.public_url
          ? <a key={a.id} href={a.public_url} target="_blank" rel="noreferrer">{chip}</a>
          : <span key={a.id}>{chip}</span>
      })}
    </div>
  )
}

export function MessageBubble({
  role, content, isDark = false, adamLabel = 'Адам',
  messageId, feedback, onFeedback, attachments,
}: MessageBubbleProps): React.ReactElement {
  const hasAtt = !!attachments && attachments.length > 0
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
          {hasAtt && <AttachmentChips items={attachments!} isDark={isDark} />}
          {content === '📎' && hasAtt ? null : content}
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
        {messageId && onFeedback && (
          <div className="flex gap-3 mt-1 ml-1">
            {([1, -1] as const).map((r) => {
              const active = feedback === r
              return (
                <button
                  key={r}
                  onClick={() => onFeedback(messageId, r)}
                  aria-label={r === 1 ? 'Хороший ответ' : 'Плохой ответ'}
                  title={r === 1 ? 'Хороший ответ' : 'Плохой ответ'}
                  className="transition-opacity"
                  style={{
                    fontSize: '13px',
                    opacity: active ? 1 : 0.4,
                    color: active
                      ? (r === 1 ? 'var(--color-ochre-dark)' : 'var(--color-terracotta-dark)')
                      : (isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'),
                  }}
                >
                  {r === 1 ? '👍' : '👎'}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
