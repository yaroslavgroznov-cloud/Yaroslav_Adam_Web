// TypingIndicator — точная копия из DRUG frontend.
// Sprint D unification, 2026-05-24.
import React from 'react'
import { useTranslation } from 'react-i18next'

export function TypingIndicator(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%]">
        <p className="text-xs mb-1 ml-1" style={{ color: '#9CA3AF' }}>{t('typing.adam_label')}</p>
        <div
          className="px-4 py-3 rounded-2xl border flex items-center gap-1"
          style={{ backgroundColor: 'white', borderColor: '#E5E7EB' }}
        >
          <span className="adam-bounce text-lg" style={{ color: '#9CA3AF', animationDelay: '0ms' }}>•</span>
          <span className="adam-bounce text-lg" style={{ color: '#9CA3AF', animationDelay: '150ms' }}>•</span>
          <span className="adam-bounce text-lg" style={{ color: '#9CA3AF', animationDelay: '300ms' }}>•</span>
          <span className="text-xs italic ml-2" style={{ color: '#9CA3AF' }}>{t('typing.adam_thinking')}</span>
        </div>
      </div>
    </div>
  )
}
