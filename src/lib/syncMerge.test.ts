import { describe, expect, it } from 'vitest'
import { isSeedProcedureId, mergeCatalogues, pickNewerProcedure, pickNewerStaff } from '@/lib/syncMerge'
import type { StaffSettings } from '@/lib/staffSettings'
import type { CatalogueItem, Procedure } from '@/types/procedure'

function proc(id: string, updatedAt: number): Procedure {
  return { id, updatedAt } as Procedure
}

function item(over: Partial<CatalogueItem> & Pick<CatalogueItem, 'id' | 'name'>): CatalogueItem {
  return {
    category: 'operator',
    meta: {},
    lastUsedAt: 1,
    useCount: 1,
    ...over,
  }
}

describe('syncMerge', () => {
  it('keeps the procedure with the later updatedAt', () => {
    expect(pickNewerProcedure(proc('a', 2), proc('a', 1))?.updatedAt).toBe(2)
    expect(pickNewerProcedure(proc('a', 1), proc('a', 3))?.updatedAt).toBe(3)
    expect(pickNewerProcedure(undefined, proc('a', 1))?.id).toBe('a')
    expect(pickNewerProcedure(proc('a', 1), undefined)?.id).toBe('a')
  })

  it('prefers local when timestamps match', () => {
    const local = proc('a', 5)
    expect(pickNewerProcedure(local, proc('a', 5))).toBe(local)
  })

  it('unions catalogue items and collapses the same name', () => {
    const merged = mergeCatalogues(
      [item({ id: 'local-1', name: 'Dr A', useCount: 2, lastUsedAt: 10, meta: { a: '1' } })],
      [item({ id: 'remote-1', name: 'Dr A', useCount: 5, lastUsedAt: 20, meta: { b: '2' } })],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.useCount).toBe(5)
    expect(merged[0]?.lastUsedAt).toBe(20)
    expect(merged[0]?.meta).toEqual({ a: '1', b: '2' })
  })

  it('keeps distinct catalogue names', () => {
    const merged = mergeCatalogues(
      [item({ id: '1', name: 'Wire A', category: 'wire' })],
      [item({ id: '2', name: 'Wire B', category: 'wire' })],
    )
    expect(merged.map((i) => i.name).sort()).toEqual(['Wire A', 'Wire B'])
  })

  it('ignores seed procedure ids', () => {
    expect(isSeedProcedureId('seed-demo')).toBe(true)
    expect(isSeedProcedureId('seed-demo-cag')).toBe(true)
    expect(isSeedProcedureId('abc-123')).toBe(false)
  })

  it('keeps the later staff list', () => {
    const older: StaffSettings = {
      consultants: ['Dr A'],
      technologists: [],
      scrubNurses: [],
      updatedAt: 10,
    }
    const newer: StaffSettings = {
      consultants: ['Dr B'],
      technologists: ['Anita'],
      scrubNurses: ['Meera'],
      updatedAt: 20,
    }
    expect(pickNewerStaff(older, newer)).toBe(newer)
    expect(pickNewerStaff(newer, older)).toBe(newer)
    expect(pickNewerStaff(older, { ...newer, updatedAt: 10 })).toBe(older)
    expect(pickNewerStaff(older, undefined)).toBe(older)
    expect(pickNewerStaff(undefined, newer)).toBe(newer)
  })
})
