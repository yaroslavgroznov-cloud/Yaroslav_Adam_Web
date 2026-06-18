// useCurrency -- F.66.3, 2026-06-18.
// Єдина точка для вибору валюти відображення цін. За замовчуванням -
// валюта, прив'язана до мови інтерфейсу (LOCALE_TO_CURRENCY). Гість може
// перевизначити вручну через CurrencyPicker (localStorage 'auto' | code).
//
// Паттерн віддзеркалює useDarkMode: localStorage + 'storage' event для
// cross-tab + custom event 'adam-currency-change' для same-tab.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CHANGE_EVENT,
  CURRENCIES,
  STORAGE_KEY,
  defaultCurrencyForLocale,
  formatPrice,
  type CurrencyCode,
} from '../utils/currency'

export type CurrencyPref = 'auto' | CurrencyCode

function readPref(): CurrencyPref {
  if (typeof window === 'undefined') return 'auto'
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (!v) return 'auto'
  if (v === 'auto') return 'auto'
  if (v in CURRENCIES) return v as CurrencyCode
  return 'auto'
}

export interface UseCurrencyResult {
  // Дефолтна валюта по мові; null якщо для мови мапа не визначає локалі (en/ru).
  defaultCurrency: CurrencyCode | null
  // Поточна валюта показу (з override або default).
  currency: CurrencyCode | null
  pref: CurrencyPref
  setPref: (p: CurrencyPref) => void
  // Зручний форматтер: повертає рядок локальної валюти або '' якщо null.
  formatLocal: (usd: number) => string
}

export function useCurrency(): UseCurrencyResult {
  const { i18n } = useTranslation()
  const [pref, setPrefState] = useState<CurrencyPref>(() => readPref())

  // Перевизначаємо на event 'storage' (інша вкладка) та on same-tab broadcast.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) setPrefState(readPref())
    }
    const onSame = (): void => setPrefState(readPref())
    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, onSame)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, onSame)
    }
  }, [])

  const defaultCurrency = useMemo(
    () => defaultCurrencyForLocale(i18n.language),
    [i18n.language],
  )

  const currency: CurrencyCode | null = pref === 'auto' ? defaultCurrency : pref

  const setPref = (p: CurrencyPref): void => {
    if (p === 'auto') {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, p)
    }
    setPrefState(p)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  const formatLocal = (usd: number): string => {
    if (currency === null || currency === 'USD') return ''
    return formatPrice(usd, currency)
  }

  return { defaultCurrency, currency, pref, setPref, formatLocal }
}
