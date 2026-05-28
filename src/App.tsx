// Adam Mobile Interface — App. Sprint D unification, 2026-05-24.
// Sprint F.6: простой path-router (без react-router-dom — лишний bundle).
// F.26 (2026-05-27): lazy imports для редких routes — default ChatInterface
// загружается синхронно, остальные подгружаются on-demand.
import { lazy, Suspense, useEffect, useState } from 'react'

import { ChatInterface } from './components/ChatInterface'

const FamilyChatPanel = lazy(() =>
  import('./components/FamilyChatPanel').then(m => ({ default: m.FamilyChatPanel })))
const FamilySlotsPanel = lazy(() =>
  import('./components/FamilySlotsPanel').then(m => ({ default: m.FamilySlotsPanel })))
const KillSwitchPanel = lazy(() =>
  import('./components/KillSwitchPanel').then(m => ({ default: m.KillSwitchPanel })))
const TasksPanel = lazy(() =>
  import('./components/TasksPanel').then(m => ({ default: m.TasksPanel })))
const CabinetsPanel = lazy(() =>
  import('./components/CabinetsPanel').then(m => ({ default: m.CabinetsPanel })))

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
  const [path, setPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  )

  useEffect(() => {
    const onPop = (): void => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const render = (): React.ReactElement => {
    if (path.startsWith('/kill-switch')) return <KillSwitchPanel />
    if (path.startsWith('/tasks')) return <TasksPanel />
    if (path.startsWith('/cabinets')) return <CabinetsPanel />
    if (path.startsWith('/family/chat')) return <FamilyChatPanel />
    if (path.startsWith('/family/slots') || path.startsWith('/family')) return <FamilySlotsPanel />
    return <ChatInterface />
  }

  return <Suspense fallback={<Fallback />}>{render()}</Suspense>
}
