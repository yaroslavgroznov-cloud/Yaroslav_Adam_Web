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
        Плотность окна не измерена — повторить
      </button>
    )
  }

  if (!budget) {
    return (
      <div className="px-3 py-2 italic" style={{ fontSize: '11px', color: muted }}>
        Меряю окно…
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
      aria-label={`Окно диалога занято на ${p} процентов`}
    >
      <div style={{
        width: `${Math.max(2, p)}%`, height: '100%',
        backgroundColor: cvet(p, isDark),
        transition: 'width var(--dur-med) var(--ease-out)',
      }} />
    </div>
  )

  if (collapsed) {
    return <div className="px-2 py-2" title={`Окно диалога: ${p}%`}>{polosa}</div>
  }

  return (
    <div className="flex flex-col gap-1.5 px-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="side-item w-full flex flex-col gap-1 px-3 py-2"
        style={{ borderColor: 'transparent', color: fg }}
        aria-expanded={open}
        aria-label={`Плотность окна диалога ${p} процентов, ${open ? 'скрыть' : 'показать'} разбор`}
      >
        <span className="w-full flex items-baseline justify-between">
          <span className="italic" style={{ fontSize: '11px', letterSpacing: '0.06em', color: muted }}>
            Окно диалога
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
              <span className="truncate italic">{x.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {x.tokens.toLocaleString('ru-RU')}
              </span>
            </span>
          ))}
          <span className="flex items-baseline justify-between gap-2 mt-1 pt-1"
                style={{ fontSize: '11px', color: fg, borderTop: `1px solid ${border}` }}>
            <span className="italic">Всего из {budget.limit.toLocaleString('ru-RU')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {budget.total.toLocaleString('ru-RU')}
            </span>
          </span>
          <span className="italic mt-1" style={{ fontSize: '10px', color: muted, opacity: 0.85 }}>
            В сводке {budget.messages_in_summary.toLocaleString('ru-RU')} сообщ.,
            живьём {budget.messages_after_summary}. Счёт — {budget.counted_by}.
          </span>
        </div>
      )}
    </div>
  )
}
