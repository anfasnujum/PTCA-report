import { useEffect, useState } from 'react'
import type { Guidewire } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { DEFAULT_WIRE_SIZE, normalizeWireSize, WIRE_SIZES, wireSizeOf } from '@/lib/constants'
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

export function WireSheet({
  open,
  initial,
  onClose,
  onSave,
  nested = false,
}: {
  open: boolean
  initial: Guidewire
  onClose: () => void
  onSave: (data: Guidewire) => void
  nested?: boolean
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const items = useCatalogueStore((s) => s.items)
  const [data, setData] = useState<Guidewire>(initial)
  const [addingSize, setAddingSize] = useState(false)
  const [customSize, setCustomSize] = useState('')

  const extrasFor = (name: string) =>
    extraSizesFrom(items.find((item) => item.category === 'wire' && item.name === name)?.meta)

  const sizesFor = (name: string) =>
    uniqueSizes([...WIRE_SIZES, ...extrasFor(name), data.name === name ? data.size ?? '' : ''])

  useEffect(() => {
    if (!open) return
    setAddingSize(false)
    setCustomSize('')
    setData({ ...initial, size: wireSizeOf(initial.size) })
  }, [open, initial])

  const applyName = (name: string, meta: Record<string, string> = {}) => {
    setData((d) => {
      const nextSizes = uniqueSizes([...WIRE_SIZES, ...extraSizesFrom(meta), ...extrasFor(name)])
      const fromMeta = meta.size && nextSizes.includes(meta.size) ? meta.size : undefined
      const size = fromMeta ?? (d.size && nextSizes.includes(d.size) ? d.size : DEFAULT_WIRE_SIZE)
      return { ...d, name, size }
    })
  }

  const addCustomSize = () => {
    const size = normalizeWireSize(customSize)
    if (!size || !data.name) return
    const extra = uniqueSizes([...extrasFor(data.name), size])
    void remember('wire', data.name, { extraSizes: extra.join(','), size })
    setData((d) => ({ ...d, size }))
    setCustomSize('')
    setAddingSize(false)
  }

  const sizes = sizesFor(data.name)

  return (
    <BottomSheet
      open={open}
      title="Guidewire"
      onClose={onClose}
      large
      nested={nested}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!data.name.trim()}
          onClick={() => {
            void remember('wire', data.name, {
              size: wireSizeOf(data.size),
              extraSizes: extrasFor(data.name).join(','),
            })
            onSave({ ...data, size: wireSizeOf(data.size) })
          }}
        >
          Save wire
        </Button>
      }
    >
      <div className="space-y-5">
        <DevicePicker category="wire" value={data.name} onChange={applyName} />
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
                placeholder='e.g. 0.014'
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
      </div>
    </BottomSheet>
  )
}
