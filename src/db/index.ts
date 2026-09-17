import Dexie, { type Table } from 'dexie'
import { isDeletedProcedureId } from '@/lib/deletedProcedures'
import { demoCagProcedure, demoProcedure, seedCatalogue, seedCatheters, seedOperators } from '@/lib/seed'
import type { CatalogueItem, Procedure } from '@/types/procedure'

class CathNoteDB extends Dexie {
  procedures!: Table<Procedure, string>
  catalogue!: Table<CatalogueItem, string>

  constructor() {
    super('CathNote')
    this.version(1).stores({
      procedures: 'id, updatedAt, status, createdAt',
      catalogue: 'id, category, lastUsedAt, name',
    })
  }
}

export const db = new CathNoteDB()

export async function ensureSeed(options?: { demoProcedures?: boolean }): Promise<void> {
  await db.open()
  if (options?.demoProcedures !== false) {
    const n = await db.procedures.count()
    if (n === 0 && !isDeletedProcedureId('seed-demo')) {
      await db.procedures.put(demoProcedure())
    }
    const hasCagDemo = await db.procedures.get('seed-demo-cag')
    if (!hasCagDemo && !isDeletedProcedureId('seed-demo-cag')) {
      await db.procedures.put(demoCagProcedure())
    }
  }
  const c = await db.catalogue.count()
  if (c === 0) {
    await db.catalogue.bulkAdd(seedCatalogue())
  }
  const ops = await db.catalogue.where('category').equals('operator').count()
  if (ops === 0) {
    await db.catalogue.bulkAdd(seedOperators())
  }
  const catheters = await db.catalogue.where('category').equals('catheter').count()
  if (catheters === 0) {
    await db.catalogue.bulkAdd(seedCatheters())
  }
  const seeded = seedCatalogue()
  const existing = await db.catalogue.toArray()
  const keys = new Set(existing.map((item) => `${item.category}:${item.name.toLowerCase()}`))
  const missing = seeded.filter((item) => !keys.has(`${item.category}:${item.name.toLowerCase()}`))
  if (missing.length) {
    await db.catalogue.bulkAdd(missing)
  }
}
