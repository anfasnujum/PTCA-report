import { create } from 'zustand'
import { db } from '@/db'
import { nid } from '@/lib/ids'
import type { CatalogueCategory, CatalogueItem } from '@/types/procedure'

type CatalogueState = {
  items: CatalogueItem[]
  hydrate: () => Promise<void>
  sorted: (category: CatalogueCategory) => CatalogueItem[]
  remember: (category: CatalogueCategory, name: string, meta?: Record<string, string>) => Promise<void>
  addCustom: (category: CatalogueCategory, name: string, meta?: Record<string, string>) => Promise<CatalogueItem>
}

export const useCatalogueStore = create<CatalogueState>((set, get) => ({
  items: [],

  hydrate: async () => {
    const items = await db.catalogue.toArray()
    set({ items })
  },

  sorted: (category) => {
    return get()
      .items.filter((i) => i.category === category)
      .slice()
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt || b.useCount - a.useCount)
  },

  remember: async (category, name, meta = {}) => {
    const existing = get().items.find(
      (i) => i.category === category && i.name.toLowerCase() === name.toLowerCase(),
    )
    const now = Date.now()
    if (existing) {
      const next: CatalogueItem = {
        ...existing,
        lastUsedAt: now,
        useCount: existing.useCount + 1,
        meta: { ...existing.meta, ...meta },
      }
      await db.catalogue.put(next)
      set({ items: get().items.map((i) => (i.id === next.id ? next : i)) })
      return
    }
    await get().addCustom(category, name, meta)
  },

  addCustom: async (category, name, meta = {}) => {
    const item: CatalogueItem = {
      id: nid(),
      category,
      name: name.trim(),
      meta,
      lastUsedAt: Date.now(),
      useCount: 1,
    }
    await db.catalogue.put(item)
    set({ items: [item, ...get().items] })
    return item
  },
}))
