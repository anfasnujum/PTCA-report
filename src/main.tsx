import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ensureSeed } from '@/db'
import { setCloudCatalogueHandler } from '@/lib/cloudSync'
import { isS3Ready } from '@/lib/s3Settings'
import { useCatalogueStore } from '@/store/useCatalogueStore'
import { useSyncStore } from '@/store/useSyncStore'

async function boot() {
  await ensureSeed({ demoProcedures: !isS3Ready() })
  await useCatalogueStore.getState().hydrate()
  setCloudCatalogueHandler(() => {
    void useCatalogueStore.getState().hydrate()
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )

  useSyncStore.getState().start()

  if (import.meta.env.PROD) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }
}

void boot()
