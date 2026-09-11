import { create } from 'zustand'
import { db } from '@/db'
import { emptyProcedure } from '@/lib/seed'
import { nid } from '@/lib/ids'
import type { Procedure, ProcedureEvent } from '@/types/procedure'

export type SaveState = 'idle' | 'saving' | 'saved'

type ProcedureState = {
  current: Procedure | null
  saveState: SaveState
  loadError: string | null
  load: (id: string) => Promise<void>
  create: () => Promise<string>
  unload: () => void
  mutate: (fn: (p: Procedure) => Procedure) => void
  addEvent: (event: ProcedureEvent) => void
  updateEvent: (id: string, event: ProcedureEvent) => void
  removeEvent: (id: string) => void
  reorderEvents: (ids: string[]) => void
  setStatus: (status: Procedure['status']) => void
}

function withOperatorFields(p: Procedure): Procedure {
  const main = p.mainOperator ?? ''
  const assistant = p.assistantOperator ?? ''
  if (main || assistant) {
    return { ...p, mainOperator: main, assistantOperator: assistant }
  }
  const ops = p.operators ?? []
  return {
    ...p,
    mainOperator: ops[0] ?? '',
    assistantOperator: ops[1] ?? '',
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

function scheduleSave(procedure: Procedure) {
  const stamped = { ...procedure, updatedAt: Date.now() }
  useProcedureStore.setState({ current: stamped, saveState: 'saving' })
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void db.procedures
      .put(stamped)
      .then(() => {
        const still = useProcedureStore.getState().current
        if (still?.id === stamped.id && still.updatedAt === stamped.updatedAt) {
          useProcedureStore.setState({ saveState: 'saved' })
        }
      })
      .catch(() => {
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
    set({ current: withOperatorFields(row), loadError: null, saveState: 'saved' })
  },

  create: async () => {
    const p = emptyProcedure(nid())
    await db.procedures.put(p)
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
    get().mutate((p) => ({ ...p, status }))
  },
}))
