import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import './i18n'
import App from './App.tsx'

// EMERGENCY (2026-05-25): после переключения SW с generateSW (CommonJS) на
// injectManifest (ES module .mjs) iPhone Safari < 16.4 не активирует новый
// SW, оставляя в кэше старый который тянет несуществующие asset hash.
// Один раз на устройство снимаем все SW + чистим caches, потом reload.
// Маркер в localStorage — чтобы не делать это на каждом визите.
const SW_CLEANUP_MARKER = 'sw-cleanup-v3-done'
async function emergencyCleanupServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (window.localStorage.getItem(SW_CLEANUP_MARKER)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    if (regs.length === 0) {
      window.localStorage.setItem(SW_CLEANUP_MARKER, '1')
      return
    }
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
    }
    window.localStorage.setItem(SW_CLEANUP_MARKER, '1')
    // Перезагружаемся — новый SW (если он есть в новом deploy) подхватится чисто
    window.location.reload()
  } catch {
    // Если что-то упало — просто продолжаем без чистки
    window.localStorage.setItem(SW_CLEANUP_MARKER, '1')
  }
}
void emergencyCleanupServiceWorkers()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
