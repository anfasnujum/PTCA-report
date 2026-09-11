import { useEffect, useState } from 'react'
import type { ImagingUse, Vessel } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Textarea } from '@/components/ui/textarea'
import { IMAGING_FINDINGS, IMAGING_MODALITIES } from '@/lib/constants'
import { LEFT_VESSELS, RIGHT_VESSELS } from '@/lib/format'

export function ImagingSheet({
  open,
  initial,
  targets,
  onClose,
  onSave,
}: {
  open: boolean
  initial: ImagingUse
  targets: Vessel[]
  onClose: () => void
  onSave: (data: ImagingUse) => void
}) {
  const [data, setData] = useState<ImagingUse>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Imaging / physiology"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" onClick={() => onSave(data)}>
          Save imaging
        </Button>
      }
    >
      <div className="space-y-5">
        <Section title="Modality">
          <ChipScroller>
            {IMAGING_MODALITIES.map((m) => (
              <Chip
                key={m}
                selected={data.modality === m}
                onClick={() => setData({ ...data, modality: m })}
              >
                {m}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Vessel">
          <ChipScroller>
            {LEFT_VESSELS.concat(RIGHT_VESSELS).map((v) => (
              <Chip
                key={v}
                selected={data.vessel === v}
                onClick={() => setData({ ...data, vessel: v })}
                className={targets.includes(v) && data.vessel !== v ? 'border-warn text-warn' : undefined}
              >
                {v}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Finding">
          <ChipScroller>
            {IMAGING_FINDINGS.map((f) => (
              <Chip
                key={f}
                selected={data.finding === f}
                onClick={() => setData({ ...data, finding: f })}
              >
                {f}
              </Chip>
            ))}
          </ChipScroller>
          <Textarea
            placeholder="Or type a finding"
            value={data.finding}
            onChange={(e) => setData({ ...data, finding: e.target.value })}
          />
        </Section>
      </div>
    </BottomSheet>
  )
}
