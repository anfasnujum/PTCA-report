const KEY = 'cathnote.deleted-procedure-ids'
const MAX_IDS = 500

export function deletedProcedureIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function rememberDeletedProcedure(id: string): void {
  const ids = deletedProcedureIds()
  ids.add(id)
  const list = [...ids]
  if (list.length > MAX_IDS) list.splice(0, list.length - MAX_IDS)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function isDeletedProcedureId(id: string): boolean {
  return deletedProcedureIds().has(id)
}
