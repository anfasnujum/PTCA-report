import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { db, ensureSeed } from '@/db'
import { setCloudCatalogueHandler } from '@/lib/cloudSync'
import { isS3Ready } from '@/lib/s3Settings'
import { useCatalogueStore } from '@/store/useCatalogueStore'
import { useSyncStore } from '@/store/useSyncStore'

async function boot() {
  // TEMP DEBUG - console access for manual local-data resets, remove once the stale-page-break diagnosis is done
  Object.assign(window, { __db: db, __sync: useSyncStore })
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
