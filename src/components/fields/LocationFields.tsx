import type { Segment, SegmentChoice, Vessel } from '@/types/procedure'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { LEFT_VESSELS, RIGHT_VESSELS, primarySegment, segmentsFor, selectSegment } from '@/lib/format'
import { cn } from '@/lib/utils'

export function LocationFields({
  vessel,
  segment,
  onVessel,
  onSegment,
  targets = [],
}: {
  vessel: Vessel
  segment?: SegmentChoice
  onVessel: (v: Vessel) => void
  onSegment: (s: Segment | undefined) => void
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
          {segmentsFor(vessel).map((s) => (
            <Chip
              key={s}
              selected={primarySegment(segment) === s}
              onClick={() => onSegment(selectSegment(segment, s))}
            >
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
    </>
  )
}
