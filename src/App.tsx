// Adam Mobile Interface — App. Sprint D unification, 2026-05-24.
// Sprint F.6: простой path-router (без react-router-dom — лишний bundle).
// F.26 (2026-05-27): lazy imports для редких routes — default ChatInterface
// загружается синхронно, остальные подгружаются on-demand.
import { lazy, Suspense, useEffect, useState } from 'react'

import { ChatInterface } from './components/ChatInterface'
import { FloatingFontScale } from './components/FloatingFontScale'
import { useFontScale } from './hooks/useFontScale'

const StolPanel = lazy(() =>
  import('./components/StolPanel').then(m => ({ default: m.StolPanel })))
const FamilySlotsPanel = lazy(() =>
  import('./components/FamilySlotsPanel').then(m => ({ default: m.FamilySlotsPanel })))
const KillSwitchPanel = lazy(() =>
  import('./components/KillSwitchPanel').then(m => ({ default: m.KillSwitchPanel })))
const TasksPanel = lazy(() =>
  import('./components/TasksPanel').then(m => ({ default: m.TasksPanel })))
const CabinetsPanel = lazy(() =>
  import('./components/CabinetsPanel').then(m => ({ default: m.CabinetsPanel })))
const CabinetSessionPage = lazy(() =>
  import('./components/CabinetSessionPage').then(m => ({ default: m.CabinetSessionPage })))
const LandingPage = lazy(() =>
  import('./components/LandingPage').then(m => ({ default: m.LandingPage })))

function Fallback(): React.ReactElement {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', fontStyle: 'italic',
      backgroundColor: 'var(--color-parchment)', color: 'var(--color-umber)',
    }}>
      …
    </div>
  )
}

export default function App() {
  // F.46: глобальный font scale применяется к <html> при загрузке и при
  // каждой смене. Один источник истины на весь SPA.
  useFontScale()

  const [path, setPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  )

  useEffect(() => {
    const onPop = (): void => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const render = (): React.ReactElement => {
    // F.45: публичная landing page для незнакомцев. Не требует CF Access auth.
    if (path.startsWith('/welcome')) return <LandingPage />
    if (path.startsWith('/kill-switch')) return <KillSwitchPanel />
    if (path.startsWith('/tasks')) return <TasksPanel />
    // /cabinets/{slug} — детальная страница; /cabinets — список
    if (/^\/cabinets\/[^/]+/.test(path)) return <CabinetSessionPage />
    if (path.startsWith('/cabinets')) return <CabinetsPanel />
    // F.56: /stol — канонический URL Стола; /family/chat — deprecated alias
    // (PWA с закешированной старой ссылкой не сломается).
    if (path.startsWith('/stol') || path.startsWith('/family/chat')) return <StolPanel />
    if (path.startsWith('/family/slots') || path.startsWith('/family')) return <FamilySlotsPanel />
    return <ChatInterface />
  }

  // На /welcome переключатель уже в header — floating не нужен.
  const showFloatingFontScale = !path.startsWith('/welcome')

  return (
    <>
      <Suspense fallback={<Fallback />}>{render()}</Suspense>
      {showFloatingFontScale && <FloatingFontScale />}
    </>
  )
}
