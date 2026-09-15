import { describe, expect, it } from 'vitest'
import { sortHomeProcedures } from '@/lib/homeList'
import type { Procedure } from '@/types/procedure'

function row(
  id: string,
  status: Procedure['status'],
  updatedAt: number,
  completedAt?: number,
): Pick<Procedure, 'id' | 'status' | 'updatedAt'> & { completedAt?: number } {
  return { id, status, updatedAt, completedAt }
}

describe('sortHomeProcedures', () => {
  it('keeps drafts and finalised above completed, newest active first', () => {
    const sorted = sortHomeProcedures([
      row('old-draft', 'draft', 10),
      row('done', 'completed', 99, 20),
      row('new-final', 'finalised', 50),
    ])
    expect(sorted.map((p) => p.id)).toEqual(['new-final', 'old-draft', 'done'])
  })

  it('puts the most recently completed case at the bottom', () => {
    const sorted = sortHomeProcedures([
      row('first-done', 'completed', 30, 30),
      row('draft', 'draft', 40),
      row('just-done', 'completed', 80, 80),
    ])
    expect(sorted.map((p) => p.id)).toEqual(['draft', 'first-done', 'just-done'])
  })
})
