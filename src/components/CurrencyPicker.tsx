// CurrencyPicker -- F.66.3, 2026-06-18.
// Маленький <select>, що дозволяє гостю обрати валюту відображення цін
// вручну (опція 'Auto' = ставити по мові). Стиль під landing language
// switcher: italic, opacity 0.7, без фону.
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useCurrency } from '../hooks/useCurrency'
import { CURRENCIES, type CurrencyCode } from '../utils/currency'

const ORDER: CurrencyCode[] = ['USD', 'UAH', 'EUR', 'PLN', 'ILS', 'INR', 'IDR', 'TRY', 'CNY']

export function CurrencyPicker(): React.ReactElement {
  const { t } = useTranslation()
  const { pref, setPref } = useCurrency()

  return (
    <label className="flex items-baseline gap-2" style={{ fontSize: '13px', opacity: 0.7 }}>
      <span className="italic">{t('currency.picker_label')}</span>
      <select
        value={pref}
        onChange={(e) => setPref(e.target.value as 'auto' | CurrencyCode)}
        style={{
          fontFamily: 'inherit',
          fontSize: '13px',
          fontStyle: 'italic',
          background: 'transparent',
          color: 'inherit',
          border: 'none',
          borderBottom: '1px solid currentColor',
          paddingBottom: '1px',
          cursor: 'pointer',
        }}
      >
        <option value="auto">{t('currency.auto')}</option>
        {ORDER.map((code) => (
          <option key={code} value={code}>
            {CURRENCIES[code].symbol} {code}
          </option>
        ))}
      </select>
    </label>
  )
}
