import { useEffect, useState } from 'react'
import type { GuideCatheter } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { GUIDE_DEVICES, GUIDE_SIZES } from '@/lib/constants'
import {
  curvesForDevice,
  isGuideDevice,
  normalizeGuideCatheter,
  parseGuideLabel,
  withGuideDevice,
} from '@/lib/guideCatheter'
import { useCatalogueStore } from '@/store/useCatalogueStore'

export function GuideSheet({
  open,
  initial,
  onClose,
  onSave,
  nested = false,
}: {
  open: boolean
  initial: GuideCatheter
  onClose: () => void
  onSave: (data: GuideCatheter) => void
  nested?: boolean
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const addCustom = useCatalogueStore((s) => s.addCustom)
  const items = useCatalogueStore((s) => s.items)
  const [data, setData] = useState<GuideCatheter>(() => normalizeGuideCatheter(initial))
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (open) {
      setData(normalizeGuideCatheter(initial))
      setAdding(false)
      setCustom('')
    }
  }, [open, initial])

  const device = data.device || 'JR'
  const curves = curvesForDevice(device)
  const customDevices = items
    .filter((item) => item.category === 'guide')
    .map((item) => item.name)
    .filter((name) => !isGuideDevice(name) && !isGuideDevice(parseGuideLabel(name).device))
  const devices = [...GUIDE_DEVICES, ...customDevices]

  return (
    <BottomSheet
      open={open}
      title="Catheter"
      onClose={onClose}
      large
      nested={nested}
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            const next = normalizeGuideCatheter(data)
            void remember('guide', next.device || device, { curve: next.curve })
            onSave(next)
          }}
        >
          Save catheter
        </Button>
      }
    >
      <div className="space-y-5">
        <Section title="Device">
          <ChipScroller>
            {devices.map((name) => (
              <Chip
                key={name}
                selected={device === name}
                onClick={() => setData((d) => ({ ...d, ...withGuideDevice({ device: d.device || '', curve: d.curve }, name) }))}
              >
                {name}
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
                  const name = custom.trim().toUpperCase()
                  if (!name) return
                  void addCustom('guide', name).then(() => {
                    setData((d) => ({ ...d, ...withGuideDevice({ device: d.device || '', curve: d.curve }, name) }))
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
        {curves.length ? (
          <Section title="Curve">
            <ChipScroller>
              {curves.map((c) => (
                <Chip
                  key={c}
                  selected={data.curve === c}
                  onClick={() => setData((d) => ({ ...d, curve: c }))}
                >
                  {c}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : null}
        <Section title="Size">
          <ChipScroller>
            {GUIDE_SIZES.map((s) => (
              <Chip key={s} selected={data.size === s} onClick={() => setData({ ...data, size: s })}>
                {s}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
      </div>
    </BottomSheet>
  )
}
