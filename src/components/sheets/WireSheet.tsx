import { useEffect, useState } from 'react'
import type { Guidewire, Segment, Vessel } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { LocationFields } from '@/components/fields/LocationFields'
import { WIRE_TYPES } from '@/lib/constants'
import { useCatalogueStore } from '@/store/useCatalogueStore'

export function WireSheet({
  open,
  initial,
  targets,
  onClose,
  onSave,
}: {
  open: boolean
  initial: Guidewire
  targets: Vessel[]
  onClose: () => void
  onSave: (data: Guidewire) => void
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const [data, setData] = useState<Guidewire>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Guidewire"
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            void remember('wire', data.name, { type: data.type })
            onSave(data)
          }}
        >
          Save wire
        </Button>
      }
    >
      <div className="space-y-5">
        <DevicePicker
          category="wire"
          value={data.name}
          onChange={(name, meta) =>
            setData((d) => ({
              ...d,
              name,
              type: (meta.type as Guidewire['type']) || d.type,
            }))
          }
        />
        <Section title="Type">
          <ChipScroller>
            {WIRE_TYPES.map((t) => (
              <Chip key={t} selected={data.type === t} onClick={() => setData({ ...data, type: t })}>
                {t}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <LocationFields
          vessel={data.vessel}
          segment={data.parkedSegment}
          targets={targets}
          onVessel={(vessel) => setData({ ...data, vessel })}
          onSegment={(segment: Segment) => setData({ ...data, parkedSegment: segment })}
        />
      </div>
    </BottomSheet>
  )
}
