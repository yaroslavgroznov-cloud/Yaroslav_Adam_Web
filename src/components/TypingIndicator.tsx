// TypingIndicator — точная копия из DRUG frontend.
// Sprint D unification, 2026-05-24.
// 29.09.2026: без белой рамки — цвет наследуется от окна, поэтому ночью
// индикатор больше не горит белым прямоугольником на тёмной умбре.
import React from 'react'
import { useTranslation } from 'react-i18next'

export function TypingIndicator(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 mb-3" style={{ opacity: 0.72 }} role="status" aria-live="polite">
      <span className="text-xs italic">✦ {t('typing.adam_label')}</span>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        <span className="adam-bounce text-lg" style={{ animationDelay: '0ms' }}>•</span>
        <span className="adam-bounce text-lg" style={{ animationDelay: '150ms' }}>•</span>
        <span className="adam-bounce text-lg" style={{ animationDelay: '300ms' }}>•</span>
      </span>
      <span className="text-xs italic">{t('typing.adam_thinking')}</span>
    </div>
  )
}
