// currency.ts -- мульти-валютне відображення цін, F.66.3, 2026-06-18.
//
// USD - канонічна одиниця обліку (так зберігається в БД, така й валюта
// фактичного списання для крипто-USDT та Lemon/Paddle). Локальна валюта
// показується ОРІЄНТОВНО, поряд з USD: списання LiqPay/ПриватБанк
// відбувається за курсом банку на момент оплати; крипто-USDT - 1:1 до USD.
//
// Дефолтна валюта вибирається за мовою інтерфейсу (LOCALE_TO_CURRENCY).
// Гість може перевизначити вручну через CurrencyPicker (зберігається в
// localStorage, broadcast подією 'adam-currency-change').
//
// Курси - hardcoded snapshot, синхронізується ручно. Той самий патерн, що
// й `cfg.liqpay_usd_uah` на backend (D:/DRUG/backend/app/config.py).
// На сторінці явно вказано "ОРІЄНТОВНО, фактичне списання за курсом банку".

export type CurrencyCode =
  | 'USD'
  | 'UAH'
  | 'EUR'
  | 'PLN'
  | 'ILS'
  | 'INR'
  | 'IDR'
  | 'TRY'
  | 'CNY'

export interface CurrencyDef {
  code: CurrencyCode
  symbol: string         // '₴', '€', 'zł', etc.
  position: 'before' | 'after'   // '$9' vs '9 ₴'
  // Множник USD -> валюта. Округлюємо до цілого, тому невелика похибка ОК.
  rate: number
  // BCP-47 locale для Intl.NumberFormat (тисячові розділювачі).
  fmtLocale: string
}

// 2026-06-18 snapshot. Курси орієнтовні (банкомат +/- 3%).
// При значній зміні курсу - оновлювати разом з cfg.liqpay_usd_uah.
export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  USD: { code: 'USD', symbol: '$',  position: 'before', rate: 1,      fmtLocale: 'en-US' },
  UAH: { code: 'UAH', symbol: '₴',  position: 'after',  rate: 44.5,   fmtLocale: 'uk-UA' },
  EUR: { code: 'EUR', symbol: '€',  position: 'after',  rate: 0.92,   fmtLocale: 'de-DE' },
  PLN: { code: 'PLN', symbol: 'zł', position: 'after',  rate: 4.0,    fmtLocale: 'pl-PL' },
  ILS: { code: 'ILS', symbol: '₪',  position: 'before', rate: 3.65,   fmtLocale: 'he-IL' },
  INR: { code: 'INR', symbol: '₹',  position: 'before', rate: 84,     fmtLocale: 'hi-IN' },
  IDR: { code: 'IDR', symbol: 'Rp', position: 'before', rate: 16300,  fmtLocale: 'id-ID' },
  TRY: { code: 'TRY', symbol: '₺',  position: 'after',  rate: 33,     fmtLocale: 'tr-TR' },
  CNY: { code: 'CNY', symbol: '¥',  position: 'before', rate: 7.2,    fmtLocale: 'zh-CN' },
}

// Мова інтерфейсу -> дефолтна валюта.
// null = не показувати локальну валюту (тільки USD). Для en/ru: ru-користувачі
// часто з UA -> можуть перемкнутися на UAH вручну; ru-говорящі поза UA
// бачать чистий USD, що не суперечить нашій ОПСЕК-лінії.
export const LOCALE_TO_CURRENCY: Record<string, CurrencyCode | null> = {
  ru: null,
  en: null,
  uk: 'UAH',
  pl: 'PLN',
  de: 'EUR',
  el: 'EUR',
  fr: 'EUR',
  he: 'ILS',
  hi: 'INR',
  id: 'IDR',
  tr: 'TRY',
  zh: 'CNY',
}

export const STORAGE_KEY = 'adam.currency'   // 'auto' | CurrencyCode
export const CHANGE_EVENT = 'adam-currency-change'

export function defaultCurrencyForLocale(lang: string | undefined): CurrencyCode | null {
  if (!lang) return null
  const base = lang.toLowerCase().split(/[-_]/)[0]
  return LOCALE_TO_CURRENCY[base] ?? null
}

// Форматує суму USD у вказаній валюті: "~373 ₴" / "~$9" / "~28 €".
// USD не отримує "~" - це наша канонічна одиниця.
export function formatPrice(usd: number, currency: CurrencyCode): string {
  const def = CURRENCIES[currency]
  const value = currency === 'USD' ? usd : Math.round(usd * def.rate)
  const formatted = new Intl.NumberFormat(def.fmtLocale, {
    maximumFractionDigits: currency === 'USD' && !Number.isInteger(usd) ? 2 : 0,
    minimumFractionDigits: currency === 'USD' && !Number.isInteger(usd) ? 2 : 0,
  }).format(value)
  const prefix = currency === 'USD' ? '' : '~'
  if (def.position === 'before') {
    return `${prefix}${def.symbol}${formatted}`
  }
  return `${prefix}${formatted} ${def.symbol}`
}

// Зручний хелпер: тільки USD у канонічному вигляді ("$9", "$9.99").
export function formatUsd(usd: number): string {
  return formatPrice(usd, 'USD')
}
