// useScrollReveal — IntersectionObserver, добавляющий .is-visible к
// элементам с классом .reveal при попадании в viewport.
// 2026-06-20. Зеркалит inline-скрипт BaseLayout.astro в groznov.net,
// но в React — переподключается при роутинге через MutationObserver.
import { useEffect } from 'react'

export function useScrollReveal(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof IntersectionObserver === 'undefined') {
      // Старые браузеры — открываем всё сразу
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.08 },
    )

    const observeAll = (): void => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        io.observe(el)
      })
    }

    observeAll()

    // SPA-роутинг: при смене path появляются новые .reveal элементы —
    // следим за document.body на subtree changes и заново подцепляем.
    const mo = new MutationObserver(() => {
      observeAll()
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}
