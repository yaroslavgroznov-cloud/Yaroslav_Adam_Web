// Выбор комнаты в шапке (01.10.2026). Раньше жил в отдельной подшапке под
// гербом и вместе с девизом съедал ~75 px высоты у окна ответа. Слово Творца:
// «перенести второй блок хэдлера в самый верхний» — теперь это один контрол
// в строке шапки, и на ПК, и на телефоне (там — компактный, без подписи).
//
// Нативный <select> оставлен намеренно: на телефоне он открывает системный
// список (крупный, доступный, привычный), а клавиатура и экранный диктор
// работают без единой строки обвязки. Меняется только вид — пилюля с
// шевроном вместо системной стрелки.
import React from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { RoomInfo } from '../api/adam'
import { ChevronDown } from './ChatIcons'

interface Props {
  id: string
  rooms: RoomInfo[]
  value: string
  onChange: (slug: string) => void
  disabled?: boolean
  isDark: boolean
  /** Телефон: без подписи «комната:», уже по ширине. */
  compact?: boolean
}

export function RoomPicker({ id, rooms, value, onChange, disabled, isDark, compact }: Props): React.ReactElement {
  const { t } = useTranslation()
  const label = t('header.room_label')
  return (
    <div className="flex items-center gap-2 min-w-0">
      {!compact && (
        <label
          htmlFor={id}
          className="italic shrink-0 transition-colors duration-700 ease-in-out"
          style={{ fontSize: '13px', color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)' }}
        >
          {label}
        </label>
      )}
      <div
        className="room-picker relative min-w-0"
        style={{
          ['--rp-bg' as string]: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
          ['--rp-border' as string]: isDark ? 'var(--color-ochre-dark)' : 'rgba(168,140,95,0.75)',
          ['--rp-hover' as string]: isDark ? 'rgba(168,140,95,0.16)' : 'rgba(168,140,95,0.12)',
          ['--rp-ink' as string]: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          ['--rp-muted' as string]: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
        }}
      >
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={compact ? label.replace(/[:：]\s*$/, '') : undefined}
          className={clsx('room-picker__select', compact && 'room-picker__select--compact')}
        >
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {t(`rooms.${r.slug}`, { defaultValue: r.name })}
            </option>
          ))}
        </select>
        <span className="room-picker__chevron" aria-hidden="true"><ChevronDown /></span>
      </div>
    </div>
  )
}
