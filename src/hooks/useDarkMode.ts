// useDarkMode — F.32, 2026-05-27.
// Единая точка для определения тёмной/светлой темы по всем компонентам.
//
// Логика:
//  1. Если в localStorage явный override 'dark'|'light' — используем его.
//  2. Иначе fallback к hour-based detection: >=19:00 или <7:00 = dark.
//
// Творец/Юля могут переключить вручную через UI (HeaderOverflowMenu),
// и переключение broadcast'ится между компонентами через storage event.
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'adam.darkMode'
export type DarkModePref = 'auto' | 'dark' | 'light'

function detectByHour(): boolean {
  const hour = new Date().getHours()
  return hour >= 19 || hour < 7
}

function readPref(): DarkModePref {
  if (typeof window === 'undefined') return 'auto'
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === 'dark' || v === 'light' || v === 'auto') return v
  return 'auto'
}

function effectiveIsDark(pref: DarkModePref): boolean {
  if (pref === 'dark') return true
  if (pref === 'light') return false
  return detectByHour()
}

export function useDarkMode(): {
  isDark: boolean
  pref: DarkModePref
  setPref: (p: DarkModePref) => void
} {
  const [pref, setPrefState] = useState<DarkModePref>(() => readPref())
  const [isDark, setIsDark] = useState<boolean>(() => effectiveIsDark(readPref()))

  useEffect(() => {
    setIsDark(effectiveIsDark(pref))
  }, [pref])

  // Слушаем изменения из других вкладок/компонентов через storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) {
        const next = readPref()
        setPrefState(next)
        setIsDark(effectiveIsDark(next))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Custom event для same-tab broadcasting (storage event только cross-tab)
  useEffect(() => {
    const onSame = (): void => {
      const next = readPref()
      setPrefState(next)
      setIsDark(effectiveIsDark(next))
    }
    window.addEventListener('adam-darkmode-change', onSame)
    return () => window.removeEventListener('adam-darkmode-change', onSame)
  }, [])

  const setPref = (p: DarkModePref): void => {
    if (p === 'auto') {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, p)
    }
    setPrefState(p)
    setIsDark(effectiveIsDark(p))
    window.dispatchEvent(new Event('adam-darkmode-change'))
  }

  return { isDark, pref, setPref }
}
