import { useEffect, useState } from 'react'
import type { BalloonType, BalloonUse, Vessel } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { LocationFields } from '@/components/fields/LocationFields'
import { BALLOON_RESULTS, BALLOON_TYPES } from '@/lib/constants'
import {
  ATM_VALUES,
  BALLOON_DIAMETERS,
  BALLOON_LENGTHS,
  defaultBalloonType,
  defaultDiameter,
  fmtMm,
  SECOND_VALUES,
} from '@/lib/format'
import { useCatalogueStore } from '@/store/useCatalogueStore'

export function BalloonSheet({
  open,
  title,
  initial,
  targets,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  initial: BalloonUse
  targets: Vessel[]
  onClose: () => void
  onSave: (data: BalloonUse) => void
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const [data, setData] = useState<BalloonUse>(initial)

  useEffect(() => {
    if (open) setData(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            void remember('balloon', data.name, { type: data.type })
            onSave(data)
          }}
        >
          Save balloon
        </Button>
      }
    >
      <div className="space-y-5">
        <DevicePicker
          category="balloon"
          value={data.name}
          onChange={(name, meta) =>
            setData((d) => ({
              ...d,
              name,
              type: (meta.type as BalloonType) || defaultBalloonType(name),
            }))
          }
        />
        <Section title="Type">
          <ChipScroller>
            {BALLOON_TYPES.map((t) => (
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
            setData({
              ...data,
              vessel,
              diameterMm: defaultDiameter(vessel, data.segment),
            })
          }
          onSegment={(segment) =>
            setData({
              ...data,
              segment,
              diameterMm: defaultDiameter(data.vessel, segment),
            })
          }
        />
        <Section title="Diameter">
          <NumberChips
            values={BALLOON_DIAMETERS}
            value={data.diameterMm}
            onChange={(diameterMm) => setData({ ...data, diameterMm })}
            format={fmtMm}
            suffix=" mm"
          />
        </Section>
        <Section title="Length">
          <NumberChips
            values={BALLOON_LENGTHS}
            value={data.lengthMm}
            onChange={(lengthMm) => setData({ ...data, lengthMm })}
            suffix=" mm"
          />
        </Section>
        {data.inflations.map((inf, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-background p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Inflation {i + 1}</p>
              {data.inflations.length > 1 ? (
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() =>
                    setData({
                      ...data,
                      inflations: data.inflations.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <Section title="Pressure">
              <NumberChips
                values={ATM_VALUES}
                value={inf.atm}
                onChange={(atm) => {
                  const inflations = data.inflations.map((x, j) => (j === i ? { ...x, atm } : x))
                  setData({ ...data, inflations })
                }}
                suffix=" atm"
              />
            </Section>
            <Section title="Duration">
              <NumberChips
                values={SECOND_VALUES}
                value={inf.seconds}
                onChange={(seconds) => {
                  const inflations = data.inflations.map((x, j) =>
                    j === i ? { ...x, seconds } : x,
                  )
                  setData({ ...data, inflations })
                }}
                suffix=" s"
              />
            </Section>
          </div>
        ))}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            const last = data.inflations.at(-1) ?? { atm: 10, seconds: 20 }
            setData({
              ...data,
              inflations: [
                ...data.inflations,
                { atm: Math.min(26, last.atm + 2), seconds: last.seconds },
              ],
            })
          }}
        >
          + Repeat inflation
        </Button>
        <Section title="Result">
          <ChipScroller>
            {BALLOON_RESULTS.map((r) => (
              <Chip
                key={r}
                selected={data.result === r}
                onClick={() => setData({ ...data, result: data.result === r ? undefined : r })}
              >
                {r}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
      </div>
    </BottomSheet>
  )
}
