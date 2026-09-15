import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { CATHETER_CURVES, CATHETER_SIZES } from '@/lib/constants'
import { formatCatheterLabel } from '@/lib/access'
import { useCatalogueStore } from '@/store/useCatalogueStore'

export type DiagnosticCatheter = {
  curve: string
  size: string
}

export function CatheterSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: DiagnosticCatheter
  onClose: () => void
  onSave: (label: string) => void
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const [data, setData] = useState<DiagnosticCatheter>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Catheter"
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!data.curve}
          onClick={() => {
            void remember('catheter', data.curve, { size: data.size })
            onSave(formatCatheterLabel(data.size, data.curve))
          }}
        >
          Save catheter
        </Button>
      }
    >
      <div className="space-y-5">
        <DevicePicker
          category="catheter"
          value={data.curve}
          onChange={(curve, meta) =>
            setData({
              curve,
              size: CATHETER_SIZES.includes(meta.size as (typeof CATHETER_SIZES)[number])
                ? meta.size
                : data.size,
            })
          }
        />
        <Section title="Curve">
          <ChipScroller>
            {CATHETER_CURVES.map((c) => (
              <Chip key={c} selected={data.curve === c} onClick={() => setData({ ...data, curve: c })}>
                {c}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Size">
          <ChipScroller>
            {CATHETER_SIZES.map((s) => (
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
