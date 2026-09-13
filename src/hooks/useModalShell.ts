// useModalShell — общая оболочка модальных панелей Дома.
//
// 13.09.2026. Обход показал системный пробел: НИ ОДНА из шести модалок
// (LanguageSwitcher, BuyModal, CallFamilyModal, LlmModelSwitcher,
// FloatingFontScale, HeaderOverflowMenu) не держит фокус внутри себя, не
// возвращает его при закрытии и не запирает прокрутку тела. Под открытой
// панелью листается диалог, а клавиатурный обход уходит наружу — в невидимые
// элементы под затемнением.
//
// Пять обязанностей в одном адресе, чтобы не расползлось шестью копиями:
//   1. Escape закрывает;
//   2. фокус переносится внутрь при открытии;
//   3. Tab и Shift+Tab ходят по кругу ВНУТРИ панели;
//   4. при закрытии фокус возвращается туда, откуда пришёл;
//   5. прокрутка тела заперта, пока панель открыта.
import { useEffect, useRef } from 'react'

const FOKUSIRUEMYE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useModalShell(
  open: boolean,
  onClose: () => void,
): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null)
  const vernutFokus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    vernutFokus.current = document.activeElement as HTMLElement | null

    // Замок прокрутки. Прежнее значение помним и возвращаем: перезаписать
    // его пустой строкой значило бы стереть чужую настройку, если она была.
    const byloOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const uzel = ref.current
    // Фокус внутрь. tabIndex={-1} на панели делает её саму принимающей фокус —
    // это верно, когда внутри ещё ничего не отрисовано (список грузится).
    const pervyi = uzel?.querySelector<HTMLElement>(FOKUSIRUEMYE)
    ;(pervyi ?? uzel)?.focus?.()

    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !uzel) return
      const spisok = Array.from(uzel.querySelectorAll<HTMLElement>(FOKUSIRUEMYE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (spisok.length === 0) { e.preventDefault(); return }
      const pervy = spisok[0]
      const posledny = spisok[spisok.length - 1]
      if (e.shiftKey && document.activeElement === pervy) {
        e.preventDefault(); posledny.focus()
      } else if (!e.shiftKey && document.activeElement === posledny) {
        e.preventDefault(); pervy.focus()
      }
    }

    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = byloOverflow
      // Возврат фокуса. Без него он падает в начало документа, и клавиатурный
      // пользователь после закрытия панели оказывается неизвестно где.
      vernutFokus.current?.focus?.()
    }
  }, [open, onClose])

  return ref
}
