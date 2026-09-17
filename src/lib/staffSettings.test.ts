import { afterEach, describe, expect, it } from 'vitest'
import { CONSULTANTS } from '@/lib/constants'
import {
  defaultStaffSettings,
  formatTechnologistNames,
  labTechnologistSlots,
  loadStaffSettings,
  matchStaffName,
  normalizeStaffList,
  parseStaffSettings,
  saveStaffSettings,
  withTechnologistSlots,
} from '@/lib/staffSettings'

const memory = new Map<string, string>()

const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value)
  },
  removeItem: (key: string) => {
    memory.delete(key)
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size
  },
}

afterEach(() => {
  memory.clear()
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('staffSettings', () => {
  it('joins two PTCA technologist slots for the report', () => {
    expect(formatTechnologistNames(['Joshy', 'Sidan'])).toBe('Joshy, Sidan')
    expect(
      labTechnologistSlots({ technologist: 'Joshy, Sidan', technologists: [] }),
    ).toEqual(['Joshy', 'Sidan'])
    expect(
      withTechnologistSlots(['Joshy', 'Sidan']),
    ).toEqual({
      technologists: ['Joshy', 'Sidan'],
      technologist: 'Joshy, Sidan',
    })
  })

  it('drops blanks, Other, and duplicate names', () => {
    expect(normalizeStaffList(['  Dr A  ', '', 'Other', 'dr a', 'Dr B', 'other'])).toEqual([
      'Dr A',
      'Dr B',
    ])
  })

  it('matches a listed name even without a space after the comma', () => {
    const name = 'Dr. Prasanth. S. MD, DM (Cardiology)'
    expect(matchStaffName(name, CONSULTANTS)).toBe(name)
    expect(matchStaffName(name.replace(', ', ','), CONSULTANTS)).toBe(name)
    expect(matchStaffName('Someone else', CONSULTANTS)).toBe('')
  })

  it('loads the bundled consultants until the list is saved', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageStub, configurable: true })
    expect(loadStaffSettings()).toEqual(defaultStaffSettings())
    expect(loadStaffSettings().consultants).toEqual([...CONSULTANTS])
  })

  it('stamps older local lists so they can win a first S3 sync', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageStub, configurable: true })
    memory.set(
      'cathnote.staff',
      JSON.stringify({
        consultants: ['Dr. A'],
        technologists: ['Anita'],
        scrubNurses: [],
      }),
    )
    const loaded = loadStaffSettings()
    expect(loaded.consultants).toEqual(['Dr. A'])
    expect(loaded.technologists).toEqual(['Anita'])
    expect(loaded.updatedAt).toBeGreaterThan(0)
  })

  it('persists custom staff lists', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageStub, configurable: true })
    const saved = saveStaffSettings({
      consultants: ['Dr. A'],
      technologists: ['Anita'],
      scrubNurses: ['Meera', 'Meera'],
      updatedAt: 1,
    })
    expect(saved.consultants).toEqual(['Dr. A'])
    expect(saved.technologists).toEqual(['Anita'])
    expect(saved.scrubNurses).toEqual(['Meera'])
    expect(saved.updatedAt).toBeGreaterThan(0)
    expect(loadStaffSettings()).toEqual(saved)
  })

  it('keeps empty lists when they were saved, and parses remote payloads', () => {
    expect(
      parseStaffSettings({
        consultants: ['Dr. A'],
        technologists: ['  ', 'Anita'],
        scrubNurses: [],
        updatedAt: 42,
      }),
    ).toEqual({
      consultants: ['Dr. A'],
      technologists: ['Anita'],
      scrubNurses: [],
      updatedAt: 42,
    })
  })
})
