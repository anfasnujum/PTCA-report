import { CONSULTANTS } from '@/lib/constants'

const STORAGE_KEY = 'cathnote.staff'

export type StaffSettings = {
  consultants: string[]
  technologists: string[]
  scrubNurses: string[]
  updatedAt: number
}

export const defaultStaffSettings = (): StaffSettings => ({
  consultants: [...CONSULTANTS],
  technologists: [],
  scrubNurses: [],
  updatedAt: 0,
})

export function normalizeStaffList(names: unknown): string[] {
  if (!Array.isArray(names)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const name of names) {
    const trimmed = String(name ?? '').trim()
    if (!trimmed || /^other$/i.test(trimmed)) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

export function matchStaffName(name: string, list: readonly string[]): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  const spaced = trimmed.replace(/,([^\s])/g, ', $1')
  return list.find((item) => item === trimmed || item === spaced) ?? ''
}

export function parseStaffSettings(raw: unknown): StaffSettings {
  const base = defaultStaffSettings()
  if (!raw || typeof raw !== 'object') return base
  const parsed = raw as Partial<StaffSettings>
  const updatedAt = Number(parsed.updatedAt)
  return {
    consultants:
      parsed.consultants === undefined ? base.consultants : normalizeStaffList(parsed.consultants),
    technologists:
      parsed.technologists === undefined
        ? base.technologists
        : normalizeStaffList(parsed.technologists),
    scrubNurses:
      parsed.scrubNurses === undefined ? base.scrubNurses : normalizeStaffList(parsed.scrubNurses),
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
  }
}

function persistStaffSettings(settings: StaffSettings): StaffSettings {
  const next: StaffSettings = {
    consultants: normalizeStaffList(settings.consultants),
    technologists: normalizeStaffList(settings.technologists),
    scrubNurses: normalizeStaffList(settings.scrubNurses),
    updatedAt: settings.updatedAt,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function loadStaffSettings(): StaffSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStaffSettings()
    const parsed = parseStaffSettings(JSON.parse(raw))
    if (parsed.updatedAt === 0) {
      return persistStaffSettings({ ...parsed, updatedAt: Date.now() })
    }
    return parsed
  } catch {
    return defaultStaffSettings()
  }
}

export function writeStaffSettings(settings: StaffSettings): StaffSettings {
  return persistStaffSettings(parseStaffSettings(settings))
}

export function saveStaffSettings(settings: StaffSettings): StaffSettings {
  return persistStaffSettings({
    ...parseStaffSettings(settings),
    updatedAt: Date.now(),
  })
}
