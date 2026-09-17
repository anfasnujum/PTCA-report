import { useEffect, useState } from 'react'
import type { CatalogueCategory, NamedDeviceUse } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { normalizeFrenchSize } from '@/lib/constants'
import { useCatalogueStore } from '@/store/useCatalogueStore'

function extraSizesFrom(meta: Record<string, string> | undefined): string[] {
  return (meta?.extraSizes ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function uniqueSizes(values: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    next.push(value)
  }
  return next
}

export function NamedDeviceSheet({
  open,
  title,
  category,
  initial,
  onClose,
  onSave,
  nested = false,
  sizesForName,
}: {
  open: boolean
  title: string
  category: CatalogueCategory
  initial: NamedDeviceUse
  onClose: () => void
  onSave: (data: NamedDeviceUse) => void
  nested?: boolean
  sizesForName?: (name: string) => readonly string[]
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const items = useCatalogueStore((s) => s.items)
  const [data, setData] = useState<NamedDeviceUse>(initial)
  const [addingSize, setAddingSize] = useState(false)
  const [customSize, setCustomSize] = useState('')

  const extrasFor = (name: string) =>
    extraSizesFrom(items.find((item) => item.category === category && item.name === name)?.meta)

  const sizesFor = (name: string) =>
    uniqueSizes([...(sizesForName?.(name) ?? []), ...extrasFor(name), data.name === name ? data.size ?? '' : ''])

  useEffect(() => {
    if (!open) return
    setAddingSize(false)
    setCustomSize('')
    if (sizesForName && initial.name && !initial.size) {
      setData({ ...initial, size: sizesFor(initial.name)[0] })
      return
    }
    setData(initial)
  }, [open, initial, sizesForName])

  const sizes = sizesForName ? sizesFor(data.name) : []

  const applyName = (name: string, meta: Record<string, string> = {}) => {
    setData((d) => {
      if (!sizesForName) return { ...d, name }
      const nextSizes = uniqueSizes([...(sizesForName(name) ?? []), ...extraSizesFrom(meta), ...extrasFor(name)])
      const fromMeta = meta.size && nextSizes.includes(meta.size) ? meta.size : undefined
      const size = fromMeta ?? (d.size && nextSizes.includes(d.size) ? d.size : nextSizes[0])
      return { ...d, name, size }
    })
  }

  const addCustomSize = () => {
    const size = normalizeFrenchSize(customSize)
    if (!size || !data.name) return
    const extra = uniqueSizes([...extrasFor(data.name), size])
    void remember(category, data.name, { extraSizes: extra.join(','), size })
    setData((d) => ({ ...d, size }))
    setCustomSize('')
    setAddingSize(false)
  }

  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={onClose}
      large
      nested={nested}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!data.name.trim()}
          onClick={() => {
            void remember(category, data.name, {
              ...(data.size ? { size: data.size } : {}),
              extraSizes: extrasFor(data.name).join(','),
            })
            onSave(data)
          }}
        >
          Save {title.toLowerCase()}
        </Button>
      }
    >
      <div className="space-y-5">
        <DevicePicker category={category} value={data.name} onChange={applyName} />
        {sizesForName ? (
          <Section title="Size">
            <ChipScroller>
              {sizes.map((size) => (
                <Chip
                  key={size}
                  selected={data.size === size}
                  onClick={() => setData((d) => ({ ...d, size }))}
                >
                  {size}
                </Chip>
              ))}
              <Chip selected={addingSize} onClick={() => setAddingSize(true)}>
                + Custom
              </Chip>
            </ChipScroller>
            {addingSize ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="e.g. 1.8F"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomSize()
                  }}
                />
                <Button onClick={addCustomSize}>Add</Button>
              </div>
            ) : null}
          </Section>
        ) : null}
      </div>
    </BottomSheet>
  )
}
