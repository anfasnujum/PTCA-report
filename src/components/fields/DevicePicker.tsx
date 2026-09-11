import { useState } from 'react'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { useCatalogueStore } from '@/store/useCatalogueStore'
import type { CatalogueCategory } from '@/types/procedure'

export function DevicePicker({
  category,
  value,
  onChange,
}: {
  category: CatalogueCategory
  value: string
  onChange: (name: string, meta: Record<string, string>) => void
}) {
  const items = useCatalogueStore((s) => s.items)
  const addCustom = useCatalogueStore((s) => s.addCustom)
  const sorted = items
    .filter((i) => i.category === category)
    .slice()
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt || b.useCount - a.useCount)
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')

  return (
    <Section title="Device">
      <ChipScroller>
        {sorted.map((item) => (
          <Chip
            key={item.id}
            selected={value === item.name}
            onClick={() => onChange(item.name, item.meta)}
          >
            {item.name}
          </Chip>
        ))}
        <Chip selected={adding} onClick={() => setAdding(true)}>
          + Custom
        </Chip>
      </ChipScroller>
      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Device name"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <Button
            onClick={() => {
              const name = custom.trim()
              if (!name) return
              void addCustom(category, name).then((item) => {
                onChange(item.name, item.meta)
                setCustom('')
                setAdding(false)
              })
            }}
          >
            Add
          </Button>
        </div>
      ) : null}
    </Section>
  )
}
