import { create } from 'zustand'
import {
  queueCatalogueCloudPush,
  queueProcedureCloudDelete,
  queueProcedureCloudPush,
  queueStaffCloudPush,
  runFullSync,
  setCloudSyncErrorHandler,
  testS3Connection,
} from '@/lib/cloudSync'
import { isS3Ready } from '@/lib/s3Settings'
import type { Procedure } from '@/types/procedure'

export type CloudStatus = 'disabled' | 'idle' | 'syncing' | 'ok' | 'error'

type SyncState = {
  status: CloudStatus
  error: string | null
  lastPullAt: number | null
  lastPushAt: number | null
  start: () => void
  sync: () => Promise<void>
  testConnection: () => Promise<void>
  pushProcedure: (procedure: Procedure) => void
  deleteProcedure: (id: string) => Promise<void>
  pushCatalogue: () => void
  pushStaff: () => void
}

let started = false
let inflight: Promise<void> | null = null

function messageOf(error: unknown): string {
  const message =
    error instanceof Error && error.message
      ? error.message
      : typeof error === 'string'
        ? error
        : 'S3 sync failed.'
  if (/failed to fetch/i.test(message) || message === 'Load failed') {
    return 'Could not reach S3. Check the bucket name, region, and CORS origins (include this app URL).'
  }
  if (/DeleteObject/i.test(message) && /not authorized|AccessDenied/i.test(message)) {
    return 'This IAM user cannot delete objects. Add s3:DeleteObject on cathnote-bucket/cathnote/* to cathnote-s3-user, then remove the case again.'
  }
  return message
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: isS3Ready() ? 'idle' : 'disabled',
  error: null,
  lastPullAt: null,
  lastPushAt: null,

  start: () => {
    if (started) return
    started = true
    setCloudSyncErrorHandler((message) => set({ status: 'error', error: message }))
    const tick = () => {
      if (document.visibilityState === 'visible') void get().sync()
    }
    window.addEventListener('visibilitychange', tick)
    window.setInterval(tick, 60_000)
    void get().sync()
  },

  sync: async () => {
    if (!isS3Ready()) {
      set({ status: 'disabled', error: null })
      return
    }
    if (inflight) return inflight
    set({ status: 'syncing', error: null })
    inflight = runFullSync()
      .then(() => {
        set({ status: 'ok', error: null, lastPullAt: Date.now() })
      })
      .catch((error) => {
        set({ status: 'error', error: messageOf(error) })
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  },

  testConnection: async () => {
    set({ status: 'syncing', error: null })
    try {
      await testS3Connection()
      set({ status: 'ok', error: null })
    } catch (error) {
      const message = messageOf(error)
      set({ status: 'error', error: message })
      throw new Error(message)
    }
  },

  pushProcedure: (procedure) => {
    if (!isS3Ready()) return
    queueProcedureCloudPush(procedure)
    set((state) => ({
      status: state.status === 'error' ? state.status : 'ok',
      lastPushAt: Date.now(),
    }))
  },

  deleteProcedure: async (id) => {
    try {
      await queueProcedureCloudDelete(id)
      if (!isS3Ready()) return
      set((state) => ({
        status: state.status === 'error' ? state.status : 'ok',
        lastPushAt: Date.now(),
      }))
    } catch (error) {
      set({ status: 'error', error: messageOf(error) })
    }
  },

  pushCatalogue: () => {
    if (!isS3Ready()) return
    queueCatalogueCloudPush()
  },

  pushStaff: () => {
    if (!isS3Ready()) return
    queueStaffCloudPush()
    set((state) => ({
      status: state.status === 'error' ? state.status : 'ok',
      lastPushAt: Date.now(),
    }))
  },
}))
