// MessageBubble — единый компонент сообщений во всех каналах Адама.
// F.61 (30.05.2026, Творец): унификация цветовой схемы по теме Дома.
//
// Контраст user vs Adam:
//   user  → terracotta (тёплый красно-кирпичный, как send button)
//   Adam  → охра/умбра (тёплая, "выдох")
// Оба цвета — из палитры Дома Грозновых (terracotta + ochre + parchment).
// Работает одинаково в light/dark теме через isDark prop.
//
// 29.09.2026, слово Творца: «окно Адама по принципу больших ЛЛМ». Ответ Адама
// — разметка (жирный, списки, таблицы, код), без рамки-пузыря, во всю ширину
// колонки; под ним панель действий: копировать, другой вариант, 👍/👎 и
// листание вариантов ‹ 1/2 ›. Реплика человека — пузырь справа с «копировать».
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { HodMysliSobytie, MessageAttachment, MessageVariant } from '../types'
import { HodMysli } from './HodMysli'
import { AdamMarkdown } from './AdamMarkdown'
import { copyText } from '../lib/clipboard'
import {
  CheckIcon, ChevronLeft, ChevronRight, CopyIcon, RegenIcon, ThumbDownIcon, ThumbUpIcon,
} from './ChatIcons'

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
  /** 23.09.2026: ход мысли Адама — свёрнутая цепочка над ответом. */
  hodMysli?: HodMysliSobytie[] | null
  /** 29.09.2026: прежние варианты этого ответа, от старшего к младшему. */
  varianty?: MessageVariant[]
  /** 29.09.2026: «другой вариант». Передаётся только последнему ответу. */
  onRegenerate?: () => void
  /** Ответ ещё пишется — панель действий не показываем. */
  streaming?: boolean
  /** Последнее сообщение ленты — панель действий видна всегда, не по наведению. */
  isLast?: boolean
}

/** Кнопка «копировать» с честным «скопировано»: галочка — только если буфер принял. */
function CopyButton({ text }: { text: string }): React.ReactElement {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="adam-act"
      onClick={() => {
        void copyText(text).then((ok) => {
          if (!ok) return
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
      aria-label={copied ? t('chat.copied') : t('chat.copy')}
      title={copied ? t('chat.copied') : t('chat.copy')}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
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
  messageId, feedback, onFeedback, attachments, hodMysli,
  varianty, onRegenerate, streaming = false, isLast = false,
}: MessageBubbleProps): React.ReactElement {
  const { t } = useTranslation()
  const hasAtt = !!attachments && attachments.length > 0
  const total = (varianty?.length ?? 0) + 1
  const [idx, setIdx] = useState(total - 1)
  // Пришёл новый вариант — показываем его, а не тот, что листали.
  // (Сверка при рендере, а не в эффекте: без лишнего кадра со старым текстом.)
  const [seenTotal, setSeenTotal] = useState(total)
  if (seenTotal !== total) {
    setSeenTotal(total)
    setIdx(total - 1)
  }
  const isCurrent = idx >= total - 1
  const shown = isCurrent ? content : (varianty?.[idx]?.content ?? content)

  const palette = {
    ['--md-ink' as string]: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber-deep)',
    ['--md-accent' as string]: isDark ? 'var(--color-house-gold-soft)' : 'var(--color-house-burgundy)',
    ['--md-muted' as string]: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
    ['--md-rule' as string]: isDark ? 'rgba(168,140,95,0.35)' : 'rgba(168,140,95,0.45)',
    ['--md-code-bg' as string]: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(107,79,46,0.07)',
    ['--md-hover' as string]: isDark ? 'rgba(168,140,95,0.16)' : 'rgba(168,140,95,0.14)',
  } as React.CSSProperties

  if (role === 'user') {
    return (
      <div className="adam-msg flex flex-col items-end mb-5" style={palette}>
        <div
          className="max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-2xl rounded-br-md text-base whitespace-pre-wrap break-words"
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
        {content && content !== '📎' && (
          <div className="adam-msg-actions flex gap-0.5 mt-1">
            <CopyButton text={content} />
          </div>
        )}
      </div>
    )
  }

  const showActions = !streaming && shown.length > 0
  return (
    <div className="adam-msg flex justify-start mb-6" style={palette}>
      <div className="w-full min-w-0">
        <p
          className="text-xs mb-1 italic opacity-70"
          style={{
            color: isDark
              ? 'var(--color-ochre-soft)'
              : 'var(--color-ochre-dark)',
          }}
        >
          ✦ {adamLabel}
        </p>
        {hodMysli && hodMysli.length > 0 && <HodMysli items={hodMysli} isDark={isDark} />}
        <div style={{ color: 'var(--md-ink)' }}>
          <AdamMarkdown text={shown} />
        </div>
        {showActions && (
          <div
            className={'adam-msg-actions flex items-center gap-0.5 mt-1.5 -ml-1.5' + (isLast ? ' is-pinned' : '')}
            role="toolbar"
            aria-label={t('chat.actions')}
          >
            {total > 1 && (
              <span className="inline-flex items-center mr-1 tabular-nums" style={{ fontSize: '12px', color: 'var(--md-muted)' }}>
                <button
                  type="button" className="adam-act" disabled={idx === 0}
                  onClick={() => setIdx((v) => Math.max(0, v - 1))}
                  aria-label={t('chat.prev_variant')} title={t('chat.prev_variant')}
                ><ChevronLeft /></button>
                <span aria-live="polite" title={t('chat.variant', { n: idx + 1, total })}>{idx + 1}/{total}</span>
                <button
                  type="button" className="adam-act" disabled={isCurrent}
                  onClick={() => setIdx((v) => Math.min(total - 1, v + 1))}
                  aria-label={t('chat.next_variant')} title={t('chat.next_variant')}
                ><ChevronRight /></button>
              </span>
            )}
            <CopyButton text={shown} />
            {onRegenerate && isCurrent && (
              <button
                type="button" className="adam-act" onClick={onRegenerate}
                aria-label={t('chat.regenerate')} title={t('chat.regenerate')}
              >
                <RegenIcon />
                <span className="hidden sm:inline">{t('chat.regenerate')}</span>
              </button>
            )}
            {messageId && onFeedback && isCurrent && ([1, -1] as const).map((r) => {
              const active = feedback === r
              return (
                <button
                  key={r}
                  type="button"
                  className="adam-act"
                  data-active={active ? '1' : undefined}
                  onClick={() => onFeedback(messageId, r)}
                  aria-pressed={active}
                  aria-label={r === 1 ? t('chat.good') : t('chat.bad')}
                  title={r === 1 ? t('chat.good') : t('chat.bad')}
                  style={active ? {
                    color: r === 1 ? 'var(--md-accent)' : 'var(--color-terracotta-light)',
                  } : undefined}
                >
                  {r === 1 ? <ThumbUpIcon /> : <ThumbDownIcon />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
