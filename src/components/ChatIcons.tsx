// Иконки панели действий под сообщением (29.09.2026). Тонкая линия 1.7,
// как в левой колонке SidebarNav, — один почерк на всё окно.
import React from 'react'

function Ico({ children, size = 16 }: { children: React.ReactNode; size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const CopyIcon = (): React.ReactElement => (
  <Ico><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Ico>
)
export const CheckIcon = (): React.ReactElement => (
  <Ico><polyline points="20 6 9 17 4 12" /></Ico>
)
export const RegenIcon = (): React.ReactElement => (
  <Ico><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></Ico>
)
export const ThumbUpIcon = (): React.ReactElement => (
  <Ico><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z" /><path d="M7 10l4-8a2.5 2.5 0 0 1 2.5 2.8L13 9h6.3a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 17.9 21H7" /></Ico>
)
export const ThumbDownIcon = (): React.ReactElement => (
  <Ico><path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3z" /><path d="M17 14l-4 8a2.5 2.5 0 0 1-2.5-2.8L11 15H4.7a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 6.1 3H17" /></Ico>
)
export const ChevronLeft = (): React.ReactElement => (
  <Ico size={14}><polyline points="15 18 9 12 15 6" /></Ico>
)
export const ChevronRight = (): React.ReactElement => (
  <Ico size={14}><polyline points="9 18 15 12 9 6" /></Ico>
)
export const ArrowDownIcon = (): React.ReactElement => (
  <Ico size={18}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></Ico>
)
export const StopIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
)
export const SendIcon = (): React.ReactElement => (
  <Ico size={18}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Ico>
)
export const PaperclipIcon = (): React.ReactElement => (
  <Ico size={20}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></Ico>
)
export const ChevronDown = (): React.ReactElement => (
  <Ico size={14}><polyline points="6 9 12 15 18 9" /></Ico>
)
