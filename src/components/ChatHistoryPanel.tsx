// ChatHistoryPanel — «История чатов» Адама.
//
// 13.09.2026, слово Творца. До этой панели истории бесед не существовало как
// понятия: интерфейс знал одну активную беседу, а «Закрыть диалог» лишь чистил
// экран — после перезагрузки та же нить возвращалась целиком.
//
// Группировка по времени — не украшение: у Творца 17 бесед с мая, плоский
// список из них нечитаем. Надзаголовки липкие, потому что при прокрутке
// теряется ответ на вопрос «а это какой давности».
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConversationBrief } from '../api/adam'
import { useModalShell } from '../hooks/useModalShell'

interface ChatHistoryPanelProps {
  isDark: boolean
  /** null — ещё грузим. Пустой массив — бесед нет. */
  items: ConversationBrief[] | null
  /** Текст отказа. Пустой результат не смеет выглядеть как «бесед нет». */
  error?: string | null
  currentId: string | null
  onOpen: (id: string) => void
  onClose: () => void
  onNew: () => void
  onRetry: () => void
}

/** Группа по КАЛЕНДАРНЫМ суткам, а не по «24 часа назад»: сообщение вчера в
 *  23:00, открытое сегодня в 10:00, иначе попадало бы в «Сегодня». */
const GRUPPY = ['today', 'yesterday', 'week', 'month', 'older'] as const
type Gruppa = typeof GRUPPY[number]

function gruppa(iso: string): Gruppa {
  const d = new Date(iso)
  const den = 24 * 60 * 60 * 1000
  const nachaloSegodnya = new Date()
  nachaloSegodnya.setHours(0, 0, 0, 0)
  const nachaloDnya = new Date(d)
  nachaloDnya.setHours(0, 0, 0, 0)
  const sutki = Math.round((nachaloSegodnya.getTime() - nachaloDnya.getTime()) / den)
  if (sutki <= 0) return 'today'
  if (sutki === 1) return 'yesterday'
  if (sutki <= 7) return 'week'
  if (sutki <= 30) return 'month'
  return 'older'
}

export function ChatHistoryPanel({
  isDark, items, error, currentId, onOpen, onClose, onNew, onRetry,
}: ChatHistoryPanelProps): React.ReactElement {
  const { t } = useTranslation()
  const border = isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber-deep)'
  const muted = isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'

  const tokeny: React.CSSProperties = {
    ['--ring' as string]: isDark ? 'var(--color-house-gold)' : 'var(--color-terracotta)',
    ['--side-hover' as string]: isDark ? 'rgba(168,140,95,0.12)' : 'rgba(168,140,95,0.10)',
    ['--side-active' as string]: isDark ? 'rgba(168,140,95,0.20)' : 'rgba(168,140,95,0.16)',
    ['--side-mark' as string]: isDark ? 'var(--color-house-gold-soft)' : 'var(--color-terracotta)',
    ['--hist-bg' as string]: bg,
  }

  const sgruppirovano = useMemo(() => {
    const m = new Map<Gruppa, ConversationBrief[]>()
    for (const it of items ?? []) {
      const g = gruppa(it.last_message_at)
      if (!m.has(g)) m.set(g, [])
      m.get(g)!.push(it)
    }
    return GRUPPY.filter((g) => m.has(g)).map((g) => ({ key: g, rows: m.get(g)! }))
  }, [items])

  const panelRef = useModalShell(true, onClose)

  return (
    <div className="fixed inset-0 z-50 flex" style={tokeny}>
      <button
        type="button"
        className="flex-1 h-full drawer-scrim"
        style={{
          backgroundColor: isDark ? 'rgba(10,7,5,0.62)' : 'rgba(31,22,17,0.55)',
          border: 'none',
        }}
        onClick={onClose}
        aria-label={t('history.close_aria')}
      />
      <aside
        id="chat-history-panel"
        ref={panelRef as React.RefObject<HTMLElement>}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('history.title')}
        className="h-full flex flex-col border-l shadow-2xl drawer-right"
        style={{ backgroundColor: bg, borderColor: border, color: fg, width: 'min(420px, 92vw)' }}
      >
        <header
          className="shrink-0 flex items-center gap-3 px-4 border-b"
          style={{ borderColor: border, height: 52 }}
        >
          <h2 className="flex-1 italic m-0" style={{ fontSize: '16px', letterSpacing: '0.04em' }}>
            {t('history.title')}
          </h2>
          <button
            type="button"
            onClick={onNew}
            className="side-item side-item--primary"
            style={{
              fontSize: '13px', padding: '6px 12px', minHeight: 32,
              backgroundColor: 'var(--color-terracotta-dark)',
              color: 'var(--color-parchment)',
              borderColor: 'var(--color-terracotta)',
              ['--side-bg' as string]: bg,
              ['--side-primary-hover' as string]: isDark
                ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
            }}
          >
            {t('history.new_short')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="side-item inline-flex items-center justify-center"
            style={{ width: 32, height: 32, minHeight: 32, borderColor: border, color: muted }}
            aria-label={t('history.close')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-3" aria-busy={items === null && !error}>
          {/* Три исхода, а не два: гружу / пусто / НЕ СМОГ. Пустой результат
              не смеет маскировать отказ источника — правило Дома. */}
          {error && (
            <div className="flex flex-col items-center gap-3 mt-10 px-6 text-center">
              <p className="italic m-0" style={{ fontSize: '14px', color: muted }}>
                {t('history.failed')}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="side-item px-3 py-2"
                style={{ fontSize: '13px', borderColor: border, color: fg, minHeight: 34 }}
              >
                {t('history.retry')}
              </button>
            </div>
          )}
          {!error && items === null && (
            <p role="status" className="italic text-center mt-10"
               style={{ fontSize: '14px', color: muted }}>
              <span className="adam-bounce" style={{ animationDelay: '0ms' }}>✦</span>
              <span className="adam-bounce" style={{ animationDelay: '160ms' }}>✦</span>
              <span className="adam-bounce" style={{ animationDelay: '320ms' }}>✦</span>
              <br />{t('history.loading')}
            </p>
          )}
          {!error && items !== null && items.length === 0 && (
            <div className="flex flex-col items-center mt-10 px-6 text-center">
              <span aria-hidden="true" style={{ fontSize: '20px', opacity: 0.5, color: muted }}>✦</span>
              <p className="italic mt-2" style={{ fontSize: '14px', color: muted, maxWidth: 260 }}>
                {t('history.empty')}
              </p>
            </div>
          )}

          {sgruppirovano.map((g) => (
            <div key={g.key} className="mb-4">
              <p
                className="hist-group-title italic px-3 m-0"
                style={{ fontSize: '11px', letterSpacing: '0.08em',
                         textTransform: 'uppercase', color: muted }}
              >
                {t(`history.group_${g.key}`)}
              </p>
              <div className="flex flex-col gap-1">
                {g.rows.map((c) => {
                  const active = c.id === currentId
                  const d = new Date(c.last_message_at)
                  // Для давних бесед показываем год: без него беседа прошлого
                  // года неотличима от сегодняшней.
                  const davnyaya = g.key === 'older'
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpen(c.id)}
                      data-active={active ? '1' : undefined}
                      className="hist-card w-full text-left px-3 py-2.5"
                      style={{ color: fg, borderColor: active ? border : 'transparent' }}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className="hist-preview" style={{ fontSize: '14px', lineHeight: 1.35 }}>
                        {c.preview}
                      </span>
                      <span className="block italic" style={{ fontSize: '11px', color: muted, marginTop: 2 }}>
                        {d.toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit',
                          ...(davnyaya ? { year: 'numeric' } : {}),
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}{t('history.msg_count', { count: c.message_count })}
                        {c.is_active ? ` · ${t('history.current')}` : ''}
                        {c.has_summary ? ` · ${t('history.in_memory')}` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <footer
          className="shrink-0 px-4 py-2.5 border-t italic"
          style={{ borderColor: border, fontSize: '11px', color: muted }}
        >
          {t('history.footer')}
        </footer>
      </aside>
    </div>
  )
}
