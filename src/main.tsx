import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ensureSeed } from '@/db'
import { useCatalogueStore } from '@/store/useCatalogueStore'

async function boot() {
  await ensureSeed()
  await useCatalogueStore.getState().hydrate()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )

  if (import.meta.env.PROD) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }
}

void boot()
