import Dexie, { type Table } from 'dexie'
import { demoProcedure, seedCatalogue } from '@/lib/seed'
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

export async function ensureSeed(): Promise<void> {
  await db.open()
  const n = await db.procedures.count()
  if (n === 0) {
    await db.procedures.put(demoProcedure())
  }
  const c = await db.catalogue.count()
  if (c === 0) {
    await db.catalogue.bulkAdd(seedCatalogue())
  }
}
