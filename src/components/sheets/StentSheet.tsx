import { useEffect, useState } from 'react'
import type { Procedure, StentType, StentUse, Vessel } from '@/types/procedure'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { DevicePicker } from '@/components/fields/DevicePicker'
import { LocationFields } from '@/components/fields/LocationFields'
import { STENT_TECHNIQUES, STENT_TYPES } from '@/lib/constants'
import {
  ATM_VALUES,
  defaultDiameter,
  extraNumbersFrom,
  fmtMm,
  mergeNumericOptions,
  parseMmValue,
  SECOND_VALUES,
  STENT_DIAMETERS,
  STENT_LENGTHS,
} from '@/lib/format'
import { lastLocation, lastStentEventId } from '@/lib/location'
import { useCatalogueStore } from '@/store/useCatalogueStore'

const COMPACT_CHIP = 'min-h-8 px-2.5'

export function StentSheet({
  open,
  initial,
  procedure,
  targets,
  onClose,
  onSave,
  lockVessel = false,
}: {
  open: boolean
  initial: StentUse
  procedure: Procedure
  targets: Vessel[]
  onClose: () => void
  onSave: (data: StentUse) => void
  lockVessel?: boolean
}) {
  const remember = useCatalogueStore((s) => s.remember)
  const items = useCatalogueStore((s) => s.items)
  const [data, setData] = useState<StentUse>(initial)
  const [addingDiameter, setAddingDiameter] = useState(false)
  const [addingLength, setAddingLength] = useState(false)
  const [customDiameter, setCustomDiameter] = useState('')
  const [customLength, setCustomLength] = useState('')
  const [deployedTo, setDeployedTo] = useState('')

  const metaFor = (name: string) => items.find((item) => item.category === 'stent' && item.name === name)?.meta

  const diametersFor = (name: string, current: number) =>
    mergeNumericOptions(STENT_DIAMETERS, extraNumbersFrom(metaFor(name), 'extraDiameters'), current)

  const lengthsFor = (name: string, current: number) =>
    mergeNumericOptions(STENT_LENGTHS, extraNumbersFrom(metaFor(name), 'extraLengths'), current)

  useEffect(() => {
    if (!open) return
    setData(initial)
    setAddingDiameter(false)
    setAddingLength(false)
    setCustomDiameter('')
    setCustomLength('')
    setDeployedTo(initial.deployedToMm != null ? String(initial.deployedToMm) : '')
  }, [open, initial])

  const persistExtras = (name: string, extra: Record<string, string>) => {
    if (!name.trim()) return
    void remember('stent', name, { type: data.type, ...extra })
  }

  const addCustomDiameter = () => {
    const n = parseMmValue(customDiameter)
    if (!n) return
    const extra = extraNumbersFrom(metaFor(data.name), 'extraDiameters')
    persistExtras(data.name, { extraDiameters: mergeNumericOptions([], extra, n).join(',') })
    setData((d) => ({ ...d, diameterMm: n }))
    setCustomDiameter('')
    setAddingDiameter(false)
  }

  const addCustomLength = () => {
    const n = parseMmValue(customLength)
    if (!n) return
    const extra = extraNumbersFrom(metaFor(data.name), 'extraLengths')
    persistExtras(data.name, { extraLengths: mergeNumericOptions([], extra, n).join(',') })
    setData((d) => ({ ...d, lengthMm: n }))
    setCustomLength('')
    setAddingLength(false)
  }

  const save = () => {
    const deployedToMm = parseMmValue(deployedTo)
    void remember('stent', data.name, { type: data.type })
    onSave({ ...data, deployedToMm })
  }

  const prevStents = procedure.events.filter((e) => e.kind === 'stent')

  return (
    <BottomSheet
      open={open}
      title="Stent"
      onClose={onClose}
      large
      nested={lockVessel}
      footer={
        <Button size="lg" className="w-full" onClick={save}>
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
              segment: loc.segment,
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
          lockVessel={lockVessel}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Section title="Diameter" unit="mm">
            <NumberChips
              values={diametersFor(data.name, data.diameterMm)}
              value={data.diameterMm}
              onChange={(diameterMm) => setData({ ...data, diameterMm })}
              format={fmtMm}
            />
            <ChipScroller>
              <Chip className={COMPACT_CHIP} selected={addingDiameter} onClick={() => setAddingDiameter(true)}>
                + Custom
              </Chip>
            </ChipScroller>
            {addingDiameter ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  inputMode="decimal"
                  placeholder="e.g. 2.8"
                  value={customDiameter}
                  onChange={(e) => setCustomDiameter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomDiameter()
                  }}
                />
                <Button onClick={addCustomDiameter}>Add</Button>
              </div>
            ) : null}
          </Section>
          <Section title="Length" unit="mm">
            <NumberChips
              values={lengthsFor(data.name, data.lengthMm)}
              value={data.lengthMm}
              onChange={(lengthMm) => setData({ ...data, lengthMm })}
            />
            <ChipScroller>
              <Chip className={COMPACT_CHIP} selected={addingLength} onClick={() => setAddingLength(true)}>
                + Custom
              </Chip>
            </ChipScroller>
            {addingLength ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  inputMode="decimal"
                  placeholder="e.g. 26"
                  value={customLength}
                  onChange={(e) => setCustomLength(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomLength()
                  }}
                />
                <Button onClick={addCustomLength}>Add</Button>
              </div>
            ) : null}
          </Section>
          <Section title="Deploy pressure" unit="atm">
            <NumberChips
              values={ATM_VALUES}
              value={data.deployedAtAtm}
              onChange={(deployedAtAtm) => setData({ ...data, deployedAtAtm })}
            />
          </Section>
          <Section title="Duration" unit="s">
            <NumberChips
              values={SECOND_VALUES}
              value={data.seconds}
              onChange={(seconds) => setData({ ...data, seconds })}
            />
          </Section>
          <Section title="Deployed to" unit="mm">
            <Input
              inputMode="decimal"
              placeholder="e.g. 3.07"
              value={deployedTo}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || /^\d*\.?\d*$/.test(v)) setDeployedTo(v)
              }}
            />
          </Section>
        </div>
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
