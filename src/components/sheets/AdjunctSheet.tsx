import { useEffect, useState } from 'react'
import type { AdjunctUse } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Textarea } from '@/components/ui/textarea'
import { ADJUNCT_TYPES } from '@/lib/constants'

export function AdjunctSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: AdjunctUse
  onClose: () => void
  onSave: (data: AdjunctUse) => void
}) {
  const [data, setData] = useState<AdjunctUse>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Adjunct / other"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" onClick={() => onSave(data)}>
          Save
        </Button>
      }
    >
      <div className="space-y-5">
        <Section title="Type">
          <ChipScroller>
            {ADJUNCT_TYPES.map((t) => (
              <Chip key={t} selected={data.type === t} onClick={() => setData({ ...data, type: t })}>
                {t}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Detail">
          <Textarea
            placeholder="Burr size, pacemaker rate, etc."
            value={data.detail}
            onChange={(e) => setData({ ...data, detail: e.target.value })}
          />
        </Section>
      </div>
    </BottomSheet>
  )
}
