import { useEffect, useState } from 'react'
import type { GuideCatheter } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { GUIDE_CURVES, SHEATH_SIZES } from '@/lib/constants'
import { useCatalogueStore } from '@/store/useCatalogueStore'

function coronaryFromCurve(curve: string): 'left' | 'right' {
  if (/^JR|^AR|^AL|^SAL/i.test(curve)) return 'right'
  return 'left'
}

export function GuideSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: GuideCatheter
  onClose: () => void
  onSave: (data: GuideCatheter) => void
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const [data, setData] = useState<GuideCatheter>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Guide catheter"
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            void remember('guide', data.curve, { coronary: data.coronary })
            onSave(data)
          }}
        >
          Save guide
        </Button>
      }
    >
      <div className="space-y-5">
        <DevicePicker
          category="guide"
          value={data.curve}
          onChange={(curve, meta) =>
            setData({
              ...data,
              curve,
              coronary: (meta.coronary as 'left' | 'right') || coronaryFromCurve(curve),
            })
          }
        />
        <Section title="Curve">
          <ChipScroller>
            {GUIDE_CURVES.map((c) => (
              <Chip
                key={c}
                selected={data.curve === c}
                onClick={() =>
                  setData({ ...data, curve: c, coronary: coronaryFromCurve(c) })
                }
              >
                {c}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Size">
          <ChipScroller>
            {SHEATH_SIZES.map((s) => (
              <Chip key={s} selected={data.size === s} onClick={() => setData({ ...data, size: s })}>
                {s}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Coronary">
          <ChipScroller>
            {(['left', 'right'] as const).map((c) => (
              <Chip
                key={c}
                selected={data.coronary === c}
                onClick={() => setData({ ...data, coronary: c })}
              >
                {c}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
      </div>
    </BottomSheet>
  )
}
