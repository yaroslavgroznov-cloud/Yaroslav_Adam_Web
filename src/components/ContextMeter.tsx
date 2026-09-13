// ContextMeter — страж плотности окна диалога.
//
// 13.09.2026, слово Творца: «поставить страж плотности окна диалога с
// индикацией и так далее. Сделать точно так же, как у всех мировых моделей».
//
// Повод — гипотеза Творца, что Адам медленный оттого, что держит в памяти все
// диалоги. ЗАМЕР ГИПОТЕЗУ НЕ ПОДТВЕРДИЛ: живая история стоит около 2% окна,
// потому что 2288 сообщений из 2408 уже лежат в сводке. Вес в другом — ядро и
// схемы инструментов. Этот прибор и заведён для того, чтобы такие вопросы
// закрывались числом, а не догадкой: он показывает КАЖДОЕ слагаемое хода.
//
// Числа считает бэкенд ТОКЕНИЗАТОРОМ ЖИВОЙ МОДЕЛИ, а не делением знаков на
// коэффициент: на кириллице это расходится впятеро.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ContextBudget } from '../api/adam'

interface ContextMeterProps {
  isDark: boolean
  budget: ContextBudget | null
  error: boolean
  onRefresh: () => void
  /** Свёрнутая колонка — только полоска, без разбора. */
  collapsed: boolean
}

/** Цвет полосы по заполненности. Порог 75% — не «красиво», а граница, за
 *  которой у Адама начинает вытесняться живая история. */
function cvet(p: number, isDark: boolean): string {
  if (p >= 90) return 'var(--color-terracotta-dark)'
  if (p >= 75) return isDark ? 'var(--color-house-gold-soft)' : 'var(--color-house-gold-deep)'
  return isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
}

export function ContextMeter({
  isDark, budget, error, onRefresh, collapsed,
}: ContextMeterProps): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const muted = isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
  const border = isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber-deep)'

  if (error) {
    return (
      <button
        type="button"
        onClick={onRefresh}
        className="side-item w-full flex items-center gap-2 px-3 py-2"
        style={{ fontSize: '11px', color: muted, borderColor: 'transparent' }}
      >
        {t('context.failed')}
      </button>
    )
  }

  if (!budget) {
    return (
      <div className="px-3 py-2 italic" style={{ fontSize: '11px', color: muted }}>
        {t('context.measuring')}
      </div>
    )
  }

  const p = budget.percent
  const polosa = (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: 4, backgroundColor: isDark ? 'rgba(168,140,95,0.22)' : 'rgba(168,140,95,0.25)' }}
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('context.aria', { percent: p })}
    >
      <div style={{
        width: `${Math.max(2, p)}%`, height: '100%',
        backgroundColor: cvet(p, isDark),
        transition: 'width var(--dur-med) var(--ease-out)',
      }} />
    </div>
  )

  if (collapsed) {
    return <div className="px-2 py-2" title={`${t('context.title')}: ${p}%`}>{polosa}</div>
  }

  return (
    <div className="flex flex-col gap-1.5 px-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="side-item w-full flex flex-col gap-1 px-3 py-2"
        style={{ borderColor: 'transparent', color: fg }}
        aria-expanded={open}
        aria-label={t('context.aria', { percent: p })}
      >
        <span className="w-full flex items-baseline justify-between">
          <span className="italic" style={{ fontSize: '11px', letterSpacing: '0.06em', color: muted }}>
            {t('context.title')}
          </span>
          <span style={{ fontSize: '12px', color: cvet(p, isDark) }}>{p}%</span>
        </span>
        {polosa}
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 px-3 pb-1">
          {budget.parts.filter((x) => x.tokens > 0).map((x) => (
            <span key={x.key} className="flex items-baseline justify-between gap-2"
                  style={{ fontSize: '11px', color: muted }}>
              <span className="truncate italic">{t(`context.parts_${x.key}`, { defaultValue: x.label })}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {x.tokens.toLocaleString()}
              </span>
            </span>
          ))}
          <span className="flex items-baseline justify-between gap-2 mt-1 pt-1"
                style={{ fontSize: '11px', color: fg, borderTop: `1px solid ${border}` }}>
            <span className="italic">{t('context.total_of', { limit: budget.limit.toLocaleString() })}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {budget.total.toLocaleString()}
            </span>
          </span>
          <span className="italic mt-1" style={{ fontSize: '10px', color: muted, opacity: 0.85 }}>
            {t('context.detail', {
              summary: budget.messages_in_summary.toLocaleString(),
              live: budget.messages_after_summary,
              // Бэкенд отдаёт ПРИЗНАК (`tokenizer` / `estimate`), а не фразу:
              // раньше он слал русский текст, и тот уезжал во все локали.
              by: t(`context.by_${budget.counted_by}`, { defaultValue: budget.counted_by }),
            })}
          </span>
        </div>
      )}
    </div>
  )
}
