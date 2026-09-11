import type { Segment, Vessel } from '@/types/procedure'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { LEFT_VESSELS, RIGHT_VESSELS, SEGMENTS } from '@/lib/format'
import { cn } from '@/lib/utils'

export function LocationFields({
  vessel,
  segment,
  onVessel,
  onSegment,
  targets = [],
}: {
  vessel: Vessel
  segment?: Segment
  onVessel: (v: Vessel) => void
  onSegment: (s: Segment) => void
  targets?: Vessel[]
}) {
  return (
    <>
      <Section title="Vessel">
        <ChipScroller>
          {LEFT_VESSELS.concat(RIGHT_VESSELS).map((v) => (
            <Chip
              key={v}
              selected={vessel === v}
              onClick={() => onVessel(v)}
              className={cn(targets.includes(v) && vessel !== v && 'border-warn text-warn')}
            >
              {v}
              {targets.includes(v) ? ' ★' : ''}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Segment">
        <ChipScroller>
          {SEGMENTS.map((s) => (
            <Chip key={s} selected={segment === s} onClick={() => onSegment(s)}>
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
    </>
  )
}
