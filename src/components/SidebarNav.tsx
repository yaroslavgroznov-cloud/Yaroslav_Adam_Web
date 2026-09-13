// SidebarNav — левая колонка диалога Адама.
//
// 13.09.2026, слово Творца: «слева расположить колонку с кнопками: НОВЫЙ ЧАТ,
// ИСТОРИЯ ЧАТОВ и так далее. Настройки и переключения функций управления из
// вертикального расположения меню перенести в левую боковую панель», и следом:
// «собери интерфейс по лучшим мировым аналогам и правилам».
//
// ПОЧЕМУ НЕ ПРОСТО ПЕРЕНОС КНОПОК. До этой правки управление жило в трёх
// местах: четыре иконки в шапке, выпадающее «•••» и селектор комнаты в
// подшапке. Функцию искали в трёх местах, а на телефоне шапка съедала экран.
//
// ЧТО ВЗЯТО ОТ МИРОВЫХ АНАЛОГОВ, А ЧТО НЕТ. Взята структура: одна колонка,
// главное действие сверху, группы с надзаголовками, сворачивание в иконки,
// выдвижение на телефоне. НЕ взяты серо-синяя палитра, жирные заголовки,
// плотная сетка 32px и скелетоны с бегущим бликом — у Дома засечковый шрифт,
// тёплая палитра, курсив в служебном и 6px радиус. Слепое копирование чужого
// облика было бы потерей лица.
//
// Панель НЕ знает, что делают её кнопки: принимает готовые группы пунктов.
// Логика осталась в ChatInterface — переносим расположение, а не поведение.
import React, { useRef } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { useModalShell } from '../hooks/useModalShell'

export interface SidebarItem {
  key: string
  label: string
  icon?: React.ReactNode
  /** Ссылка (маршрут SPA) — взаимоисключима с onClick. */
  href?: string
  onClick?: () => void
  disabled?: boolean
  /** Подсветка активного пункта (например, открытая История). */
  active?: boolean
  /** Правый бейдж: непрочитанные. В свёрнутой колонке — точка на иконке. */
  badge?: string
  /** Выделить как главное действие (Новый чат). */
  primary?: boolean
  /** Пункт — тумблер панели: озвучиваем состояние. */
  expanded?: boolean
  /** Пункт — тумблер настройки (тема, уведомления). */
  pressed?: boolean
}

export interface SidebarGroup {
  key: string
  /** Заголовок группы; пустой — группа без подписи. */
  title?: string
  items: SidebarItem[]
}

interface SidebarNavProps {
  isDark: boolean
  groups: SidebarGroup[]
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  /** Низ колонки: выбор комнаты. */
  footer?: React.ReactNode
}

export function SidebarNav({
  isDark, groups, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile,
  footer,
}: SidebarNavProps): React.ReactElement {
  const { t } = useTranslation()
  const border = isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber-deep)'
  const muted = isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment-soft)'

  // Токены темы отдаём переменными: тема Дома живёт в JS (useDarkMode), а не
  // классом на <html> — значит CSS-правила иначе про неё не узнают.
  const tokeny: React.CSSProperties = {
    ['--ring' as string]: isDark ? 'var(--color-house-gold)' : 'var(--color-terracotta)',
    ['--side-bg' as string]: bg,
    ['--side-hover' as string]: isDark ? 'rgba(168,140,95,0.12)' : 'rgba(168,140,95,0.10)',
    ['--side-press' as string]: isDark ? 'rgba(168,140,95,0.24)' : 'rgba(168,140,95,0.18)',
    ['--side-active' as string]: isDark ? 'rgba(168,140,95,0.20)' : 'rgba(168,140,95,0.16)',
    ['--side-mark' as string]: isDark ? 'var(--color-house-gold-soft)' : 'var(--color-terracotta)',
    ['--side-primary-hover' as string]: isDark
      ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
    ['--tip-bg' as string]: isDark ? 'var(--color-parchment)' : 'var(--color-umber-deep)',
    ['--tip-fg' as string]: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
    ['--tip-border' as string]: isDark ? 'var(--color-ochre)' : 'var(--color-ochre-dark)',
  }

  const shevron = (v: 'left' | 'right'): React.ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={v === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
  const krest = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )

  /** Одна строка колонки. `uzko` — узкий режим (только иконки). */
  const renderItem = (it: SidebarItem, uzko: boolean, vYashchike: boolean): React.ReactElement => {
    // Координату подписи ставим в момент наведения: тултип у нас `fixed`,
    // иначе его обрежет `overflow-y: auto` контейнера групп.
    const stavitTip = (e: React.MouseEvent | React.FocusEvent): void => {
      if (!uzko) return
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      ;(e.currentTarget as HTMLElement).style.setProperty('--tip-y', `${r.top + r.height / 2}px`)
    }

    const obshchie = {
      className: clsx(
        'side-item w-full flex items-center gap-3 text-left',
        uzko ? 'justify-center px-0 py-2.5 side-tip' : 'px-3 py-2.5',
        it.primary && 'side-item--primary',
      ),
      style: {
        fontSize: '14px',
        lineHeight: 1.35,
        letterSpacing: '0.02em',
        color: it.primary ? 'var(--color-parchment)' : fg,
        backgroundColor: it.primary ? 'var(--color-terracotta-dark)' : undefined,
        borderColor: it.primary ? 'var(--color-terracotta)' : 'transparent',
        opacity: it.disabled ? undefined : (it.primary || it.active ? 1 : 0.88),
        minHeight: vYashchike ? 44 : undefined,
      } as React.CSSProperties,
      'data-active': it.active ? '1' : undefined,
      'data-tip': uzko ? it.label : undefined,
      onMouseEnter: stavitTip,
      onFocus: stavitTip,
      // Развёрнутый пункт подпись УЖЕ показывает: дублировать её в aria-label
      // значит перекрыть видимый текст и сломать голосовое управление.
      'aria-label': uzko || it.badge ? (it.badge ? `${it.label}, ${it.badge}` : it.label) : undefined,
      'aria-expanded': it.expanded,
      'aria-pressed': it.pressed,
      'aria-current': it.active && it.href ? ('page' as const) : undefined,
    }

    const vnutri = (
      <>
        <span className="shrink-0 inline-flex items-center justify-center relative"
              style={{ width: 20, height: 20 }} aria-hidden="true">
          {it.icon}
          {/* Непрочитанное не имеет права исчезать при сворачивании колонки. */}
          {uzko && it.badge && (
            <span
              className="absolute rounded-full"
              style={{
                width: 6, height: 6, top: -1, right: -3,
                backgroundColor: 'var(--color-terracotta)',
              }}
            />
          )}
        </span>
        {!uzko && <span className="flex-1 truncate">{it.label}</span>}
        {!uzko && it.badge && (
          <span
            aria-hidden="true"
            className="shrink-0 italic rounded-full px-2"
            style={{ fontSize: '11px', color: muted, border: `1px solid ${border}` }}
          >
            {it.badge}
          </span>
        )}
      </>
    )

    // Ссылка и кнопка — разные теги: маршрут должен открываться средней
    // кнопкой мыши и в новой вкладке, кнопка — нет.
    if (it.href && !it.disabled) {
      return <a key={it.key} href={it.href} {...obshchie} onClick={onCloseMobile}>{vnutri}</a>
    }
    return (
      <button
        key={it.key}
        type="button"
        disabled={it.disabled}
        onClick={() => { if (!it.disabled) { it.onClick?.(); onCloseMobile() } }}
        {...obshchie}
      >
        {vnutri}
      </button>
    )
  }

  /** Сама колонка. `uzko` — узкий режим; в ящике он всегда false. */
  const panel = (uzko: boolean, vYashchike: boolean): React.ReactElement => (
    <nav
      className={clsx('side-col flex flex-col shrink-0 h-full border-r',
        !vYashchike && (uzko ? 'w-[60px]' : 'w-[240px]'))}
      style={{
        ...tokeny,
        backgroundColor: bg, borderColor: border, color: fg,
        width: vYashchike ? 'min(300px, 86vw)' : undefined,
      }}
      aria-label={t('sidebar.menu_aria')}
    >
      <div
        className={clsx('flex items-center gap-2 border-b shrink-0',
          uzko ? 'justify-center px-0' : 'px-3')}
        style={{ borderColor: border, height: 56 }}
      >
        {!uzko && (
          <img
            src="/dom_groznovyh.jpg"
            alt=""
            aria-hidden="true"
            className="h-7 w-auto select-none"
            style={{
              mixBlendMode: isDark ? 'normal' : 'multiply',
              filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
            }}
          />
        )}
        {!uzko && (
          <span className="flex-1 truncate italic" style={{ fontSize: '15px', letterSpacing: '0.04em' }}>
            Адам
          </span>
        )}
        {!vYashchike && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="side-item shrink-0 hidden md:inline-flex items-center justify-center"
            style={{ width: 28, height: 28, minHeight: 28, color: muted, borderColor: border }}
            aria-label={uzko ? t('sidebar.expand') : t('sidebar.collapse')}
            aria-expanded={!uzko}
            title={uzko ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            {shevron(uzko ? 'right' : 'left')}
          </button>
        )}
        {vYashchike && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="side-item shrink-0 inline-flex items-center justify-center"
            style={{ width: 32, height: 32, minHeight: 32, color: muted, borderColor: border }}
            aria-label={t('sidebar.close')}
            title={t('sidebar.close')}
          >
            {krest}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">
        {groups.map((g, gi) => (
          <div key={g.key} className="flex flex-col gap-0.5">
            {g.title && !uzko && (
              <p
                className="italic px-3 pb-1"
                style={{
                  fontSize: '11px', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: muted,
                }}
              >
                {g.title}
              </p>
            )}
            {/* В узкой колонке надзаголовков нет — иначе группы слипаются
                в одну ленту; вместо них короткая черта. */}
            {uzko && gi > 0 && (
              <span
                aria-hidden="true"
                className="block"
                style={{
                  width: 24, height: 1, margin: '6px auto',
                  backgroundColor: 'rgba(168,140,95,0.25)',
                }}
              />
            )}
            {g.items.map((it) => renderItem(it, uzko, vYashchike))}
          </div>
        ))}
      </div>

      {footer && (
        <div className="shrink-0 border-t px-2 py-3 flex flex-col gap-2" style={{ borderColor: border }}>
          {/* В узкой колонке подвал НЕ исчезает и не подменяется чужой
              иконкой: 13.09 Творец сказал прямо — «скрепку не вижу». Прежняя
              редакция рисовала здесь выбор комнаты, который к тому же уехал
              в подшапку, и кнопка осталась мёртвой. Теперь узкий режим —
              это тот же подвал, только без подписей. */}
          {footer}
        </div>
      )}
    </nav>
  )

  const yashchikRef = useModalShell(mobileOpen, onCloseMobile)
  const scrimRef = useRef<HTMLButtonElement | null>(null)

  return (
    <>
      {/* Десктоп: колонка в потоке. */}
      <div className="hidden md:flex h-full">{panel(collapsed, false)}</div>

      {/* Телефон: выдвижная панель. Ящик НЕ наследует свёрнутость десктопа —
          иначе свернул на столе, открыл на телефоне и получил полосу 60px. */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
          aria-label={t('sidebar.menu_aria')}
          ref={yashchikRef as React.RefObject<HTMLDivElement>}
          tabIndex={-1}
        >
          <div className="h-full drawer-left"
               style={{ boxShadow: '0 0 48px -12px rgba(42, 31, 21, 0.55)' }}>
            {panel(false, true)}
          </div>
          <button
            ref={scrimRef}
            type="button"
            className="flex-1 h-full drawer-scrim"
            style={{
              // Тёплая тень Дома, а не холодный чёрный: под пергаментом
              // rgba(0,0,0,…) даёт зеленоватый отлив.
              backgroundColor: isDark ? 'rgba(10,7,5,0.62)' : 'rgba(31,22,17,0.55)',
              border: 'none',
            }}
            onClick={onCloseMobile}
            aria-label={t('sidebar.close')}
          />
        </div>
      )}
    </>
  )
}
