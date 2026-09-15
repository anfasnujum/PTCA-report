import type { Procedure, ProcedureStatus } from '@/types/procedure'

export function isCompletedProcedure(p: { status: ProcedureStatus; completedAt?: number }): boolean {
  return p.status === 'completed' || Boolean(p.completedAt)
}

export function isLockedProcedure(p: { status: ProcedureStatus }): boolean {
  return p.status === 'finalised' || p.status === 'completed'
}

export function sortHomeProcedures<T extends Pick<Procedure, 'status' | 'updatedAt'> & { completedAt?: number }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const aDone = isCompletedProcedure(a)
    const bDone = isCompletedProcedure(b)
    if (aDone !== bDone) return aDone ? 1 : -1
    if (aDone && bDone) return (a.completedAt ?? a.updatedAt) - (b.completedAt ?? b.updatedAt)
    return b.updatedAt - a.updatedAt
  })
}
