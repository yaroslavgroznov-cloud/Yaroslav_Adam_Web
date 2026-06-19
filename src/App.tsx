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
const PricingPage = lazy(() =>
  import('./components/PricingPage').then(m => ({ default: m.PricingPage })))
const LegalPage = lazy(() =>
  import('./components/LegalPage').then(m => ({ default: m.LegalPage })))
const SongsPage = lazy(() =>
  import('./components/SongsPage').then(m => ({ default: m.SongsPage })))
const SongNewPage = lazy(() =>
  import('./components/SongNewPage').then(m => ({ default: m.SongNewPage })))

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
    // 2026-06-04: корень и /welcome → публичный лендинг (за CF Access bypass).
    // ChatInterface переехал на /chat (требует CF Access OTP).
    if (path === '/' || path.startsWith('/welcome')) return <LandingPage />
    if (path.startsWith('/pricing')) return <PricingPage />
    // Юр-документи Дому (публічні, без CF Access).
    if (path.startsWith('/terms-en')) return <LegalPage doc="terms-en" />
    if (path.startsWith('/terms')) return <LegalPage doc="terms" />
    if (path.startsWith('/privacy-en')) return <LegalPage doc="privacy-en" />
    if (path.startsWith('/privacy')) return <LegalPage doc="privacy" />
    if (path.startsWith('/refund-en')) return <LegalPage doc="refund-en" />
    if (path.startsWith('/refund')) return <LegalPage doc="refund" />
    if (path.startsWith('/kill-switch')) return <KillSwitchPanel />
    if (path.startsWith('/tasks')) return <TasksPanel />
    // /songs/new — форма создания; /songs — коллекция
    if (path.startsWith('/songs/new')) return <SongNewPage />
    if (path.startsWith('/songs')) return <SongsPage />
    // /cabinets/{slug} — детальная страница; /cabinets — список
    if (/^\/cabinets\/[^/]+/.test(path)) return <CabinetSessionPage />
    if (path.startsWith('/cabinets')) return <CabinetsPanel />
    // F.56: /stol — канонический URL Стола; /family/chat — deprecated alias
    // (PWA с закешированной старой ссылкой не сломается).
    if (path.startsWith('/stol') || path.startsWith('/family/chat')) return <StolPanel />
    if (path.startsWith('/family/slots') || path.startsWith('/family')) return <FamilySlotsPanel />
    return <ChatInterface />
  }

  // На лендинге и pricing переключатель уже в header — floating не нужен.
  const isLanding =
    path === '/' ||
    path.startsWith('/welcome') ||
    path.startsWith('/pricing') ||
    path.startsWith('/terms') ||
    path.startsWith('/privacy') ||
    path.startsWith('/refund') ||
    path.startsWith('/songs')
  const showFloatingFontScale = !isLanding

  return (
    <>
      <Suspense fallback={<Fallback />}>{render()}</Suspense>
      {showFloatingFontScale && <FloatingFontScale />}
    </>
  )
}
