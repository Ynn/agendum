import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegistered(sw: ServiceWorkerRegistration | undefined) {
      if (!sw) return
      const worker = sw.active || sw.waiting || sw.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'activated') {
          console.info('PWA service worker activated')
        }
      })
    },
    onRegisterError(error: unknown) {
      console.warn('PWA service worker registration failed', error)
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
