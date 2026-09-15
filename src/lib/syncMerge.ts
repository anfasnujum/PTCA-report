import type { CatalogueItem, Procedure } from '@/types/procedure'

export function isSeedProcedureId(id: string): boolean {
  return id.startsWith('seed-')
}

export function pickNewerProcedure(local: Procedure | undefined, remote: Procedure | undefined): Procedure | undefined {
  if (!local) return remote
  if (!remote) return local
  if (remote.updatedAt > local.updatedAt) return remote
  return local
}

function mergeCatalogueItem(a: CatalogueItem, b: CatalogueItem): CatalogueItem {
  const newer = b.lastUsedAt >= a.lastUsedAt ? b : a
  const older = newer === b ? a : b
  return {
    ...newer,
    id: older.id,
    useCount: Math.max(a.useCount, b.useCount),
    meta: { ...older.meta, ...newer.meta },
  }
}

export function mergeCatalogues(local: CatalogueItem[], remote: CatalogueItem[]): CatalogueItem[] {
  const byId = new Map<string, CatalogueItem>()
  for (const item of [...remote, ...local]) {
    const prev = byId.get(item.id)
    byId.set(item.id, prev ? mergeCatalogueItem(prev, item) : item)
  }

  const byName = new Map<string, CatalogueItem>()
  for (const item of byId.values()) {
    const key = `${item.category}:${item.name.trim().toLowerCase()}`
    const prev = byName.get(key)
    byName.set(key, prev ? mergeCatalogueItem(prev, item) : item)
  }
  return [...byName.values()]
}
