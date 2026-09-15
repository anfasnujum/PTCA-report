import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { ANGIO_CONTRAST_AGENTS, ANGIO_CONTRAST_VOLUMES } from '@/lib/constants'
import { formatContrastLabel } from '@/lib/access'

export type ContrastChoice = {
  agent: string
  volumeMl: number | ''
}

export function ContrastSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: ContrastChoice
  onClose: () => void
  onSave: (label: string) => void
}) {
  const [data, setData] = useState<ContrastChoice>(initial)
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (open) {
      setData(initial)
      setAdding(false)
      setCustom('')
    }
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Contrast"
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!data.agent}
          onClick={() => onSave(formatContrastLabel(data.agent, data.volumeMl))}
        >
          Save contrast
        </Button>
      }
    >
      <div className="space-y-5">
        <Section title="Agent">
          <ChipScroller>
            {ANGIO_CONTRAST_AGENTS.map((name) => (
              <Chip
                key={name}
                selected={data.agent === name}
                onClick={() => setData({ ...data, agent: name })}
              >
                {name}
              </Chip>
            ))}
            <Chip selected={adding} onClick={() => setAdding(true)}>
              + Custom
            </Chip>
          </ChipScroller>
          {adding ? (
            <div className="mt-2 flex gap-2">
              <Input
                autoFocus
                placeholder="Contrast name"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <Button
                onClick={() => {
                  const name = custom.trim()
                  if (!name) return
                  setData({ ...data, agent: name })
                  setCustom('')
                  setAdding(false)
                }}
              >
                Add
              </Button>
            </div>
          ) : null}
          {data.agent && !ANGIO_CONTRAST_AGENTS.includes(data.agent as (typeof ANGIO_CONTRAST_AGENTS)[number]) ? (
            <p className="mt-2 text-sm font-medium">{data.agent}</p>
          ) : null}
        </Section>
        <Section title="Volume">
          <NumberChips
            values={ANGIO_CONTRAST_VOLUMES}
            value={typeof data.volumeMl === 'number' ? data.volumeMl : 0}
            onChange={(volumeMl) => setData({ ...data, volumeMl })}
            suffix=" mL"
          />
          <div className="relative mt-2">
            <Input
              inputMode="numeric"
              value={data.volumeMl === '' ? '' : String(data.volumeMl)}
              placeholder="Custom volume"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '')
                setData({ ...data, volumeMl: v === '' ? '' : Number(v) })
              }}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              mL
            </span>
          </div>
        </Section>
      </div>
    </BottomSheet>
  )
}
