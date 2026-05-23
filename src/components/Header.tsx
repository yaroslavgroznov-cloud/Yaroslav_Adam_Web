// Тонкий хедер: «Adam» + аватар + текущий пользователь.
// Sprint C, 2026-05-23.
import React from 'react'
import { Avatar } from './Avatar'
import type { AdamProfile } from '../types'

interface HeaderProps {
  profile: AdamProfile
  onClearHistory: () => void
}

export function Header({ profile, onClearHistory }: HeaderProps): React.ReactElement {
  const userLabel = profile.displayName ?? profile.email ?? null
  return (
    <header
      className="flex items-center justify-between gap-3 px-4 py-3 border-b"
      style={{
        backgroundColor: 'var(--color-pine-700)',
        color: 'var(--color-cream-50)',
        borderColor: 'var(--color-pine-900)',
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar size={36} />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold">Adam</span>
          <span className="text-[11px] opacity-70">опора, не подстройка</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        {userLabel && <span className="text-xs opacity-80 hidden sm:block">{userLabel}</span>}
        <button
          type="button"
          onClick={onClearHistory}
          className="text-[11px] underline opacity-70 hover:opacity-100"
        >
          очистить
        </button>
      </div>
    </header>
  )
}
