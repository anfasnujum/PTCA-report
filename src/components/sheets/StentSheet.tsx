import { useEffect, useState } from 'react'
import type { Procedure, Segment, StentType, StentUse, Vessel } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { LocationFields } from '@/components/fields/LocationFields'
import { STENT_TECHNIQUES, STENT_TYPES } from '@/lib/constants'
import {
  ATM_VALUES,
  defaultDiameter,
  fmtMm,
  SECOND_VALUES,
  STENT_DIAMETERS,
  STENT_LENGTHS,
} from '@/lib/format'
import { lastLocation, lastStentEventId } from '@/lib/location'
import { useCatalogueStore } from '@/store/useCatalogueStore'

export function StentSheet({
  open,
  initial,
  procedure,
  targets,
  onClose,
  onSave,
}: {
  open: boolean
  initial: StentUse
  procedure: Procedure
  targets: Vessel[]
  onClose: () => void
  onSave: (data: StentUse) => void
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const [data, setData] = useState<StentUse>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  const prevStents = procedure.events.filter((e) => e.kind === 'stent')

  return (
    <BottomSheet
      open={open}
      title="Stent"
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            void remember('stent', data.name, { type: data.type })
            onSave(data)
          }}
        >
          Save stent
        </Button>
      }
    >
      <div className="space-y-5">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const loc = lastLocation(procedure)
            setData({
              ...data,
              vessel: loc.vessel,
              segment: loc.segment as Segment | undefined,
              diameterMm: defaultDiameter(loc.vessel, loc.segment),
            })
          }}
        >
          Same as previous
        </Button>
        <DevicePicker
          category="stent"
          value={data.name}
          onChange={(name, meta) =>
            setData((d) => ({ ...d, name, type: (meta.type as StentType) || d.type }))
          }
        />
        <Section title="Type">
          <ChipScroller>
            {STENT_TYPES.map((t) => (
              <Chip key={t} selected={data.type === t} onClick={() => setData({ ...data, type: t })}>
                {t}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <LocationFields
          vessel={data.vessel}
          segment={data.segment}
          targets={targets}
          onVessel={(vessel) =>
            setData({ ...data, vessel, diameterMm: defaultDiameter(vessel, data.segment) })
          }
          onSegment={(segment) =>
            setData({ ...data, segment, diameterMm: defaultDiameter(data.vessel, segment) })
          }
        />
        <Section title="Diameter">
          <NumberChips
            values={STENT_DIAMETERS}
            value={data.diameterMm}
            onChange={(diameterMm) => setData({ ...data, diameterMm })}
            format={fmtMm}
            suffix=" mm"
          />
        </Section>
        <Section title="Length">
          <NumberChips
            values={STENT_LENGTHS}
            value={data.lengthMm}
            onChange={(lengthMm) => setData({ ...data, lengthMm })}
            suffix=" mm"
          />
        </Section>
        <Section title="Deploy pressure">
          <NumberChips
            values={ATM_VALUES}
            value={data.deployedAtAtm}
            onChange={(deployedAtAtm) => setData({ ...data, deployedAtAtm })}
            suffix=" atm"
          />
        </Section>
        <Section title="Duration">
          <NumberChips
            values={SECOND_VALUES}
            value={data.seconds}
            onChange={(seconds) => setData({ ...data, seconds })}
            suffix=" s"
          />
        </Section>
        <Section title="Technique">
          <ChipScroller>
            {STENT_TECHNIQUES.map((t) => (
              <Chip
                key={t}
                selected={data.technique === t}
                onClick={() => setData({ ...data, technique: data.technique === t ? undefined : t })}
              >
                {t}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        {prevStents.length > 0 ? (
          <Section title="Overlap">
            <ChipScroller>
              <Chip
                selected={!data.overlapWithEventId}
                onClick={() => setData({ ...data, overlapWithEventId: undefined })}
              >
                None
              </Chip>
              {prevStents.map((s) =>
                s.kind === 'stent' ? (
                  <Chip
                    key={s.id}
                    selected={data.overlapWithEventId === s.id}
                    onClick={() => setData({ ...data, overlapWithEventId: s.id })}
                  >
                    {s.data.name} {fmtMm(s.data.diameterMm)}×{s.data.lengthMm}
                  </Chip>
                ) : null,
              )}
              <Chip
                selected={Boolean(data.overlapWithEventId) && data.overlapWithEventId === lastStentEventId(procedure, data.vessel)}
                onClick={() => {
                  const id = lastStentEventId(procedure, data.vessel)
                  if (id) setData({ ...data, overlapWithEventId: id })
                }}
              >
                Last in vessel
              </Chip>
            </ChipScroller>
          </Section>
        ) : null}
      </div>
    </BottomSheet>
  )
}
