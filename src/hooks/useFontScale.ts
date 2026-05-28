// useFontScale — глобальный масштаб шрифта для всего приложения.
// F.46, 2026-05-28.
//
// 3 уровня: normal / large (×1.2) / xl (×1.4). Применяется к
// document.documentElement через CSS `zoom` — единое место для всего SPA.
// Сохраняется в localStorage, синхронизируется между вкладками
// через storage event + same-tab custom event.
//
// Тот же паттерн что у useDarkMode (см. ./useDarkMode.ts).
import { useEffect, useState } from 'react'

export type FontScale = 'normal' | 'large' | 'xl'

const STORAGE_KEY = 'adam-font-scale'
const EVENT_NAME = 'adam-fontscale-change'

const MULTIPLIER: Record<FontScale, number> = {
  normal: 1,
  large: 1.2,
  xl: 1.4,
}

function readScale(): FontScale {
  if (typeof window === 'undefined') return 'normal'
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === 'large' || v === 'xl') return v
  return 'normal'
}

function applyToDocument(scale: FontScale): void {
  if (typeof document === 'undefined') return
  const m = MULTIPLIER[scale]
  // `zoom` поддерживается Chrome/Edge/Safari/Firefox 126+ (включая mobile).
  // Маштабирует целиком всё дерево — не нужно переписывать px на rem.
  ;(document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom =
    m === 1 ? '' : String(m)
}

export function useFontScale(): {
  scale: FontScale
  setScale: (s: FontScale) => void
} {
  const [scale, setScaleState] = useState<FontScale>(() => readScale())

  // Применяем к <html> при каждой смене
  useEffect(() => {
    applyToDocument(scale)
  }, [scale])

  // Слушаем cross-tab синхронизацию
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) setScaleState(readScale())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Same-tab broadcasting
  useEffect(() => {
    const onSame = (): void => setScaleState(readScale())
    window.addEventListener(EVENT_NAME, onSame)
    return () => window.removeEventListener(EVENT_NAME, onSame)
  }, [])

  const setScale = (s: FontScale): void => {
    if (s === 'normal') {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, s)
    }
    setScaleState(s)
    applyToDocument(s)
    window.dispatchEvent(new Event(EVENT_NAME))
  }

  return { scale, setScale }
}
