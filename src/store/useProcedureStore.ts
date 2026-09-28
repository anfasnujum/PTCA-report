import { create } from 'zustand'
import { db } from '@/db'
import { beginProcedureEdit, endProcedureEdit } from '@/lib/cloudSync'
import { emptyLab, emptyProcedure } from '@/lib/seed'
import { nid } from '@/lib/ids'
import { useSyncStore } from '@/store/useSyncStore'
import type { Procedure, ProcedureEvent, ProcedureKind } from '@/types/procedure'

export type SaveState = 'idle' | 'saving' | 'saved'

type ProcedureState = {
  current: Procedure | null
  saveState: SaveState
  loadError: string | null
  load: (id: string) => Promise<void>
  create: (kind?: ProcedureKind) => Promise<string>
  unload: () => void
  mutate: (fn: (p: Procedure) => Procedure) => void
  addEvent: (event: ProcedureEvent) => void
  updateEvent: (id: string, event: ProcedureEvent) => void
  removeEvent: (id: string) => void
  reorderEvents: (ids: string[]) => void
  setStatus: (status: Procedure['status']) => void
  remove: (id: string) => Promise<void>
}

function withOperatorFields(p: Procedure): Procedure {
  const kind = p.kind === 'cag' ? 'cag' : 'ptca'
  const main = p.mainOperator ?? ''
  const assistant = p.assistantOperator ?? ''
  const lab = p.lab ?? emptyLab()
  if (main || assistant) {
    return { ...p, kind, mainOperator: main, assistantOperator: assistant, lab }
  }
  const ops = p.operators ?? []
  return {
    ...p,
    kind,
    mainOperator: ops[0] ?? '',
    assistantOperator: ops[1] ?? '',
    lab,
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

function scheduleSave(procedure: Procedure) {
  const stamped = { ...procedure, updatedAt: Date.now() }
  beginProcedureEdit(stamped.id)
  useProcedureStore.setState({ current: stamped, saveState: 'saving' })
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void db.procedures
      .put(stamped)
      .then(() => {
        endProcedureEdit(stamped.id)
        useSyncStore.getState().pushProcedure(stamped)
        const still = useProcedureStore.getState().current
        if (still?.id === stamped.id && still.updatedAt === stamped.updatedAt) {
          useProcedureStore.setState({ saveState: 'saved' })
        }
      })
      .catch(() => {
        endProcedureEdit(stamped.id)
        useProcedureStore.setState({ saveState: 'idle' })
      })
  }, 220)
}

export const useProcedureStore = create<ProcedureState>((set, get) => ({
  current: null,
  saveState: 'idle',
  loadError: null,

  load: async (id) => {
    const row = await db.procedures.get(id)
    if (!row) {
      set({ current: null, loadError: 'Procedure not found', saveState: 'idle' })
      return
    }
    const current = get().current
    if (get().saveState === 'saving' && current?.id === row.id) return
    if (current?.id === row.id && current.updatedAt === row.updatedAt) {
      if (get().loadError) set({ loadError: null })
      return
    }
    set({ current: withOperatorFields(row), loadError: null, saveState: 'saved' })
  },

  create: async (kind: ProcedureKind = 'ptca') => {
    const p = emptyProcedure(nid(), kind)
    await db.procedures.put(p)
    useSyncStore.getState().pushProcedure(p)
    set({ current: p, loadError: null, saveState: 'saved' })
    return p.id
  },

  unload: () => set({ current: null, saveState: 'idle', loadError: null }),

  mutate: (fn) => {
    const current = get().current
    if (!current) return
    scheduleSave(fn(current))
  },

  addEvent: (event) => {
    get().mutate((p) => ({ ...p, events: [...p.events, event] }))
  },

  updateEvent: (id, event) => {
    get().mutate((p) => ({
      ...p,
      events: p.events.map((e) => (e.id === id ? event : e)),
    }))
  },

  removeEvent: (id) => {
    get().mutate((p) => ({
      ...p,
      events: p.events.filter((e) => e.id !== id),
    }))
  },

  reorderEvents: (ids) => {
    get().mutate((p) => {
      const map = new Map(p.events.map((e) => [e.id, e]))
      const next = ids.map((id) => map.get(id)).filter((e): e is ProcedureEvent => Boolean(e))
      return { ...p, events: next }
    })
  },

  setStatus: (status) => {
    get().mutate((p) => ({
      ...p,
      status,
      completedAt: status === 'completed' ? Date.now() : undefined,
    }))
  },

  remove: async (id) => {
    await db.procedures.delete(id)
    const current = get().current
    if (current?.id === id) set({ current: null, saveState: 'idle', loadError: null })
    await useSyncStore.getState().deleteProcedure(id)
  },
}))
