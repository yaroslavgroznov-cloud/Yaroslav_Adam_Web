// Adam Mobile Interface — App. Sprint D unification, 2026-05-24.
// Sprint F.6: простой path-router (без react-router-dom — лишний bundle).
import { useEffect, useState } from 'react'

import { ChatInterface } from './components/ChatInterface'
import { FamilyChatPanel } from './components/FamilyChatPanel'
import { FamilySlotsPanel } from './components/FamilySlotsPanel'
import { KillSwitchPanel } from './components/KillSwitchPanel'

export default function App() {
  const [path, setPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  )

  useEffect(() => {
    const onPop = (): void => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (path.startsWith('/kill-switch')) {
    return <KillSwitchPanel />
  }
  if (path.startsWith('/family/chat')) {
    return <FamilyChatPanel />
  }
  if (path.startsWith('/family/slots') || path.startsWith('/family')) {
    return <FamilySlotsPanel />
  }
  return <ChatInterface />
}
