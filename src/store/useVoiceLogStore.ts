import { create } from 'zustand'
import { nid } from '@/lib/ids'
import type { VoiceAction, VoiceDecision } from '@/lib/voice/schema'

const STORAGE_KEY = 'cathnote.voice.log'
const MAX_ENTRIES = 40

export type VoiceLogEntry = {
  id: string
  at: number
  procedureId: string
  transcript: string
  status: VoiceDecision['status'] | 'error'
  summary: string
  actions: VoiceAction[]
  question?: string
  options?: Array<{ label: string; summary: string }>
  error?: string
  undone?: boolean
}

type VoiceLogState = {
  entries: VoiceLogEntry[]
  record: (entry: Omit<VoiceLogEntry, 'id' | 'at'> & { id?: string; at?: number }) => string
  markUndone: (id: string) => void
  clearProcedure: (procedureId: string) => void
}

function loadEntries(): VoiceLogEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VoiceLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(entries: VoiceLogEntry[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    /* ignore */
  }
}

export const useVoiceLogStore = create<VoiceLogState>((set, get) => ({
  entries: typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis ? loadEntries() : [],

  record: (entry) => {
    const id = entry.id ?? nid()
    const next: VoiceLogEntry = {
      ...entry,
      id,
      at: entry.at ?? Date.now(),
      actions: entry.actions ?? [],
    }
    const entries = [next, ...get().entries.filter((item) => item.id !== id)].slice(0, MAX_ENTRIES)
    persist(entries)
    set({ entries })
    console.info('[cathnote.voice]', next)
    return id
  },

  markUndone: (id) => {
    const entries = get().entries.map((item) => (item.id === id ? { ...item, undone: true } : item))
    persist(entries)
    set({ entries })
  },

  clearProcedure: (procedureId) => {
    const entries = get().entries.filter((item) => item.procedureId !== procedureId)
    persist(entries)
    set({ entries })
  },
}))

export function logFromDecision(
  procedureId: string,
  transcript: string,
  decision: VoiceDecision,
  extra?: Partial<VoiceLogEntry>,
): string {
  if (decision.status === 'apply') {
    return useVoiceLogStore.getState().record({
      procedureId,
      transcript,
      status: 'apply',
      summary: decision.summary,
      actions: decision.actions,
      ...extra,
    })
  }
  if (decision.status === 'clarify') {
    return useVoiceLogStore.getState().record({
      procedureId,
      transcript,
      status: 'clarify',
      summary: decision.question,
      actions: [],
      question: decision.question,
      options: decision.options.map((option) => ({ label: option.label, summary: option.summary })),
      ...extra,
    })
  }
  return useVoiceLogStore.getState().record({
    procedureId,
    transcript,
    status: 'none',
    summary: decision.reason,
    actions: [],
    ...extra,
  })
}
