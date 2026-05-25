// Inbox-баннер входящих звонков — F.7, 2026-05-25.
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { FamilyCall } from '../api/family'

interface Props {
  isDark: boolean
  calls: FamilyCall[]
  onSeen: (callId: number) => void
}

function useTimeAgo() {
  const { t } = useTranslation()
  return (iso: string): string => {
    const d = new Date(iso)
    const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000))
    if (sec < 60) return t('familyInbox.ago_sec', { n: sec })
    const min = Math.floor(sec / 60)
    if (min < 60) return t('familyInbox.ago_min', { n: min })
    const h = Math.floor(min / 60)
    if (h < 24) return t('familyInbox.ago_hour', { n: h })
    const days = Math.floor(h / 24)
    return t('familyInbox.ago_day', { n: days })
  }
}

export function FamilyInbox({ isDark, calls, onSeen }: Props): React.ReactElement | null {
  const { t } = useTranslation()
  const timeAgo = useTimeAgo()
  if (calls.length === 0) return null
  return (
    <div
      className="shrink-0 border-b px-4 sm:px-10 py-3"
      style={{
        borderColor: 'var(--color-terracotta-dark)',
        backgroundColor: isDark ? 'rgba(192,98,63,0.18)' : 'rgba(192,98,63,0.08)',
      }}
    >
      <div className="flex flex-col gap-2">
        {calls.map((c) => (
          <div
            key={c.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div className="flex flex-col" style={{ fontSize: '14px' }}>
              <span>
                <b style={{ color: 'var(--color-terracotta-dark)' }}>
                  {t('familyInbox.calling_you', { name: c.by_name })}
                </b>
                <span className="italic opacity-70 ml-2" style={{ fontSize: '12px' }}>
                  {timeAgo(c.called_at)}
                </span>
              </span>
              {c.message && (
                <span className="italic opacity-90" style={{ fontSize: '13px' }}>
                  «{c.message}»
                </span>
              )}
            </div>
            <button
              onClick={() => onSeen(c.id)}
              className="italic underline underline-offset-4 decoration-1 shrink-0 self-start sm:self-center"
              style={{
                fontSize: '13px',
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
              }}
            >
              {t('familyInbox.mark_seen')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
