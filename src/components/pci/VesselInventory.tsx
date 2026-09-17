import { useMemo, useState } from 'react'
import { ActionBar } from '@/components/timeline/ActionBar'
import { TimelineList } from '@/components/timeline/TimelineList'
import { BalloonSheet } from '@/components/sheets/BalloonSheet'
import { StentSheet } from '@/components/sheets/StentSheet'
import { GuideSheet } from '@/components/sheets/GuideSheet'
import { WireSheet } from '@/components/sheets/WireSheet'
import { NamedDeviceSheet } from '@/components/sheets/NamedDeviceSheet'
import { ImagingSheet } from '@/components/sheets/ImagingSheet'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { useProcedureStore } from '@/store/useProcedureStore'
import { nid } from '@/lib/ids'
import { defaultBalloon, lastLocation } from '@/lib/location'
import { eventsForVessel, mergeVesselReorder } from '@/lib/pciEvents'
import {
  ANGIO_FEATURES,
  defaultAspirationSize,
  defaultGuideExtensionSize,
  defaultMicrocatheterSize,
  GUIDE_SIZES,
  DEFAULT_WIRE_SIZE,
  sizesForAspiration,
  sizesForGuideExtension,
  sizesForMicrocatheter,
} from '@/lib/constants'
import { defaultDiameter, featureLabel, formatStenosis, isRightCoronary } from '@/lib/format'
import { defaultGuideCatheter } from '@/lib/guideCatheter'
import { suggestedPostDil } from '@/lib/noteTemplate'
import {
  DEFAULT_PCI_STENOSIS,
  draftPciLesion,
  pciLesionForVessel,
  upsertPciLesion,
} from '@/lib/pciLesion'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { LocationFields } from '@/components/fields/LocationFields'
import { StenosisPicker } from '@/components/fields/StenosisPicker'
import { Input } from '@/components/ui/input'
import { LEFT_VESSELS } from '@/lib/format'
import {
  ptcaInventoryBlocks,
  vesselPciKind,
} from '@/lib/ptcaReport'
import type {
  BalloonUse,
  EventKind,
  GuideCatheter,
  Guidewire,
  ImagingUse,
  NamedDeviceUse,
  ProcedureEvent,
  StentUse,
  Vessel,
  VesselPciKind,
} from '@/types/procedure'

type Sheet =
  | { kind: 'guideCatheter'; initial: GuideCatheter; editId?: string }
  | { kind: 'thrombusAspiration' | 'microcatheter' | 'guideExtension'; initial: NamedDeviceUse; editId?: string }
  | { kind: 'guidewire'; initial: Guidewire; editId?: string }
  | { kind: 'predilatation' | 'postdilatation' | 'lmcaPot'; initial: BalloonUse; editId?: string }
  | { kind: 'stent'; initial: StentUse; editId?: string }
  | { kind: 'imaging'; initial: ImagingUse; editId?: string }

export function VesselInventory({ vessel }: { vessel: Vessel }) {
  const current = useProcedureStore((s) => s.current)
  const addEvent = useProcedureStore((s) => s.addEvent)
  const updateEvent = useProcedureStore((s) => s.updateEvent)
  const removeEvent = useProcedureStore((s) => s.removeEvent)
  const mutate = useProcedureStore((s) => s.mutate)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [postDil, setPostDil] = useState<BalloonUse | null>(null)
  const [combinedStenosisFor, setCombinedStenosisFor] = useState<Vessel | null>(null)

  const vesselEvents = useMemo(
    () => (current ? eventsForVessel(current.events, vessel) : []),
    [current, vessel],
  )
  const storedLesion = current ? pciLesionForVessel(current.baselineAngio, vessel) : undefined
  const pciKind = current ? vesselPciKind(current, vessel) : 'PTCA'
  const combined = current?.vesselCombined?.[vessel]
  const combinedOn = combined?.on === true
  const combinedVessels = combined?.vessels ?? []
  const inventory = current
    ? ptcaInventoryBlocks(current).find((block) => block.vessel === vessel)
    : undefined

  if (!current) return null

  const loc = lastLocation(current, vessel)
  const lesion = storedLesion ?? draftPciLesion(vessel, 0)

  const setLesion = (next: typeof lesion) => {
    mutate((p) => ({
      ...p,
      baselineAngio: upsertPciLesion(p.baselineAngio, vessel, next),
    }))
  }

  const commit = (event: ProcedureEvent, editId?: string) => {
    if (editId) updateEvent(editId, { ...event, id: editId })
    else addEvent(event)
    setSheet(null)
  }

  const openNew = (kind: EventKind) => {
    if (kind === 'guideCatheter') {
      setSheet({
        kind,
        initial: {
          ...defaultGuideCatheter(
            GUIDE_SIZES.includes(current.access.sheathSize as (typeof GUIDE_SIZES)[number])
              ? (current.access.sheathSize as (typeof GUIDE_SIZES)[number])
              : '6F',
            isRightCoronary(vessel),
          ),
          vessel,
        },
      })
      return
    }
    if (kind === 'thrombusAspiration') {
      setSheet({
        kind,
        initial: { name: 'Export', size: defaultAspirationSize('Export'), vessel },
      })
      return
    }
    if (kind === 'microcatheter') {
      setSheet({
        kind,
        initial: { name: 'Finecross', size: defaultMicrocatheterSize('Finecross'), vessel },
      })
      return
    }
    if (kind === 'guideExtension') {
      setSheet({
        kind,
        initial: { name: 'GuideLiner', size: defaultGuideExtensionSize('GuideLiner'), vessel },
      })
      return
    }
    if (kind === 'guidewire') {
      setSheet({
        kind,
        initial: { name: 'BMW', size: DEFAULT_WIRE_SIZE, vessel },
      })
      return
    }
    if (kind === 'predilatation' || kind === 'postdilatation' || kind === 'lmcaPot') {
      const b = defaultBalloon(current, vessel)
      if (kind === 'postdilatation' || kind === 'lmcaPot') {
        b.name = 'NC Sapphire'
        b.type = 'non-compliant'
        b.diameterMm = Math.min(5, defaultDiameter(vessel, loc.segment) + 0.25)
        b.lengthMm = 12
        b.inflations = [{ atm: 18, seconds: 15 }]
      }
      setSheet({ kind, initial: b })
      return
    }
    if (kind === 'stent') {
      setSheet({
        kind,
        initial: {
          name: 'Supraflex Cruz',
          type: 'DES',
          diameterMm: defaultDiameter(vessel, loc.segment),
          lengthMm: 24,
          vessel,
          segment: loc.segment,
          deployedAtAtm: 14,
          seconds: 20,
          technique: vesselEvents.some((e) => e.kind === 'predilatation')
            ? 'After predilatation'
            : 'Direct stenting',
        },
      })
      return
    }
    if (kind === 'imaging') {
      setSheet({ kind, initial: { modality: 'IVUS', vessel, finding: '' } })
    }
  }

  const openEdit = (e: ProcedureEvent) => {
    switch (e.kind) {
      case 'guideCatheter':
      case 'thrombusAspiration':
      case 'microcatheter':
      case 'guideExtension':
      case 'guidewire':
      case 'predilatation':
      case 'postdilatation':
      case 'lmcaPot':
      case 'stent':
      case 'imaging':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id } as Sheet)
        break
      default:
        break
    }
  }

  const duplicate = (e: ProcedureEvent) => {
    addEvent({ ...e, id: nid(), at: Date.now() })
  }

  const repeatInflation = (e: ProcedureEvent) => {
    if (e.kind !== 'predilatation' && e.kind !== 'postdilatation' && e.kind !== 'lmcaPot') return
    const last = e.data.inflations.at(-1) ?? { atm: 10, seconds: 15 }
    updateEvent(e.id, {
      ...e,
      data: {
        ...e.data,
        inflations: [...e.data.inflations, { atm: Math.min(26, last.atm + 2), seconds: last.seconds }],
      },
    })
  }

  const setPciKind = (kind: VesselPciKind) => {
    mutate((p) => ({
      ...p,
      vesselPciKind: { ...p.vesselPciKind, [vessel]: kind },
    }))
  }

  const setCombinedOn = (on: boolean) => {
    mutate((p) => ({
      ...p,
      vesselCombined: {
        ...p.vesselCombined,
        [vessel]: { on, vessels: p.vesselCombined?.[vessel]?.vessels ?? [] },
      },
    }))
  }

  const setPartnerLesion = (partner: Vessel, next: typeof lesion) => {
    mutate((p) => ({
      ...p,
      baselineAngio: upsertPciLesion(p.baselineAngio, partner, next),
    }))
  }

  const addCombinedVessel = (next: Vessel) => {
    mutate((p) => {
      const selected = p.vesselCombined?.[vessel]?.vessels ?? []
      if (selected.includes(next)) return p
      const baselineAngio = pciLesionForVessel(p.baselineAngio, next)
        ? p.baselineAngio
        : upsertPciLesion(p.baselineAngio, next, {
            stenosis: DEFAULT_PCI_STENOSIS,
            stenosisMode: 'single',
          })
      return {
        ...p,
        baselineAngio,
        vesselCombined: {
          ...p.vesselCombined,
          [vessel]: { on: true, vessels: [...selected, next] },
        },
      }
    })
  }

  const removeCombinedVessel = (next: Vessel) => {
    mutate((p) => {
      const selected = p.vesselCombined?.[vessel]?.vessels ?? []
      return {
        ...p,
        vesselCombined: {
          ...p.vesselCombined,
          [vessel]: { on: true, vessels: selected.filter((item) => item !== next) },
        },
      }
    })
    setCombinedStenosisFor(null)
  }

  const openCombinedStenosis = (next: Vessel) => {
    if (!combinedVessels.includes(next)) addCombinedVessel(next)
    setCombinedStenosisFor(next)
  }

  return (
    <div>
      <div className="mb-4 space-y-4">
        <Section title="Procedure">
          <ChipScroller>
            {(['PTCA', 'POBA'] as const).map((kind) => (
              <Chip key={kind} selected={pciKind === kind} onClick={() => setPciKind(kind)}>
                {kind}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        {vessel === 'LMCA' ? (
          <>
            <Switch yesNo label="Combined process" checked={combinedOn} onChange={setCombinedOn} />
            {combinedOn ? (
              <ChipScroller>
                {LEFT_VESSELS.filter((item) => item !== 'LMCA').map((item) => {
                  const selected = combinedVessels.includes(item)
                  const partnerLesion = selected
                    ? pciLesionForVessel(current.baselineAngio, item)
                    : undefined
                  return (
                    <Chip
                      key={item}
                      selected={selected}
                      onClick={() => openCombinedStenosis(item)}
                    >
                      {partnerLesion ? `${item} ${formatStenosis(partnerLesion)}` : item}
                    </Chip>
                  )
                })}
              </ChipScroller>
            ) : null}
          </>
        ) : null}
        <LocationFields
          lockVessel
          vessel={vessel}
          segment={lesion.segment}
          onVessel={() => {}}
          onSegment={(segment) => setLesion({ ...lesion, segment })}
        />
        <StenosisPicker title="Stenosis" f={lesion} setF={setLesion} unset={!storedLesion} />
        <Section title="Description">
          <ChipScroller>
            {ANGIO_FEATURES.map((feat) => (
              <Chip
                key={feat}
                selected={lesion.features.includes(feat)}
                onClick={() =>
                  setLesion({
                    ...lesion,
                    features: lesion.features.includes(feat)
                      ? lesion.features.filter((x) => x !== feat)
                      : [...lesion.features, feat],
                  })
                }
              >
                {featureLabel(feat)}
              </Chip>
            ))}
            <Chip
              selected={lesion.descriptionCustom !== undefined}
              onClick={() =>
                setLesion({
                  ...lesion,
                  descriptionCustom: lesion.descriptionCustom !== undefined ? undefined : '',
                })
              }
            >
              Custom
            </Chip>
          </ChipScroller>
          {lesion.descriptionCustom !== undefined ? (
            <Input
              placeholder="e.g. Thrombotic Occlusion"
              value={lesion.descriptionCustom}
              onChange={(e) => setLesion({ ...lesion, descriptionCustom: e.target.value })}
            />
          ) : null}
        </Section>
      </div>
      <p className="mb-3 text-sm text-muted">
        Add hardware in the order it was used on this vessel. Drag to reorder.
      </p>
      {inventory?.lines.some((line) => line.value) ? (
        <ul className="mb-3 space-y-0.5 text-sm text-muted">
          {inventory.lines
            .filter((line) => line.value)
            .map((line) => (
              <li key={line.label} className="whitespace-pre-wrap">
                {line.label}: {line.value}
              </li>
            ))}
        </ul>
      ) : null}
      <TimelineList
        events={vesselEvents}
        onReorder={(ids) =>
          mutate((p) => ({ ...p, events: mergeVesselReorder(p.events, vessel, ids) }))
        }
        onEdit={openEdit}
        onDelete={removeEvent}
        onRepeat={repeatInflation}
        onDuplicate={duplicate}
      />
      <div className="mt-3">
        <ActionBar
          variant="inline"
          showNote={false}
          kinds={[
            'guideCatheter',
            'thrombusAspiration',
            'microcatheter',
            'guidewire',
            'guideExtension',
            'predilatation',
            'stent',
            'postdilatation',
            'lmcaPot',
            'imaging',
          ]}
          onAdd={(kind) => {
            if (kind === 'note' || kind === 'adjunct') return
            openNew(kind)
          }}
        />
      </div>

      <GuideSheet
        nested
        open={sheet?.kind === 'guideCatheter'}
        initial={
          sheet?.kind === 'guideCatheter' ? sheet.initial : defaultGuideCatheter('6F', true)
        }
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit(
            { id: nid(), at: Date.now(), kind: 'guideCatheter', data: { ...data, vessel } },
            sheet?.kind === 'guideCatheter' ? sheet.editId : undefined,
          )
        }
      />
      <NamedDeviceSheet
        nested
        open={sheet?.kind === 'thrombusAspiration'}
        title="Thrombus aspiration"
        category="aspiration"
        sizesForName={sizesForAspiration}
        initial={
          sheet?.kind === 'thrombusAspiration'
            ? sheet.initial
            : { name: 'Export', size: defaultAspirationSize('Export'), vessel }
        }
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit(
            { id: nid(), at: Date.now(), kind: 'thrombusAspiration', data: { ...data, vessel } },
            sheet?.kind === 'thrombusAspiration' ? sheet.editId : undefined,
          )
        }
      />
      <NamedDeviceSheet
        nested
        open={sheet?.kind === 'microcatheter'}
        title="Microcatheter"
        category="microcatheter"
        sizesForName={sizesForMicrocatheter}
        initial={
          sheet?.kind === 'microcatheter'
            ? sheet.initial
            : { name: 'Finecross', size: defaultMicrocatheterSize('Finecross'), vessel }
        }
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit(
            { id: nid(), at: Date.now(), kind: 'microcatheter', data: { ...data, vessel } },
            sheet?.kind === 'microcatheter' ? sheet.editId : undefined,
          )
        }
      />
      <NamedDeviceSheet
        nested
        open={sheet?.kind === 'guideExtension'}
        title="Guide extension"
        category="guideExtension"
        sizesForName={sizesForGuideExtension}
        initial={
          sheet?.kind === 'guideExtension'
            ? sheet.initial
            : { name: 'GuideLiner', size: defaultGuideExtensionSize('GuideLiner'), vessel }
        }
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit(
            { id: nid(), at: Date.now(), kind: 'guideExtension', data: { ...data, vessel } },
            sheet?.kind === 'guideExtension' ? sheet.editId : undefined,
          )
        }
      />
      <WireSheet
        nested
        open={sheet?.kind === 'guidewire'}
        initial={
          sheet?.kind === 'guidewire'
            ? sheet.initial
            : { name: 'BMW', size: DEFAULT_WIRE_SIZE, vessel }
        }
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit(
            { id: nid(), at: Date.now(), kind: 'guidewire', data: { ...data, vessel } },
            sheet?.kind === 'guidewire' ? sheet.editId : undefined,
          )
        }
      />
      <BalloonSheet
        lockVessel
        open={
          sheet?.kind === 'predilatation' ||
          sheet?.kind === 'postdilatation' ||
          sheet?.kind === 'lmcaPot'
        }
        title={
          sheet?.kind === 'lmcaPot'
            ? 'LMCA POT'
            : sheet?.kind === 'postdilatation'
              ? 'Post-dilatation'
              : 'Balloon / predilatation'
        }
        initial={
          sheet?.kind === 'predilatation' ||
          sheet?.kind === 'postdilatation' ||
          sheet?.kind === 'lmcaPot'
            ? sheet.initial
            : defaultBalloon(current, vessel)
        }
        targets={[vessel]}
        onClose={() => setSheet(null)}
        onSave={(data) => {
          const kind =
            sheet?.kind === 'lmcaPot'
              ? 'lmcaPot'
              : sheet?.kind === 'postdilatation'
                ? 'postdilatation'
                : 'predilatation'
          commit(
            { id: nid(), at: Date.now(), kind, data: { ...data, vessel } },
            sheet?.kind === 'predilatation' ||
              sheet?.kind === 'postdilatation' ||
              sheet?.kind === 'lmcaPot'
              ? sheet.editId
              : undefined,
          )
        }}
      />
      <StentSheet
        lockVessel
        open={sheet?.kind === 'stent'}
        initial={
          sheet?.kind === 'stent'
            ? sheet.initial
            : {
                name: 'Supraflex Cruz',
                type: 'DES',
                diameterMm: 3.0,
                lengthMm: 24,
                vessel,
                segment: 'mid',
                deployedAtAtm: 14,
                seconds: 20,
              }
        }
        procedure={current}
        targets={[vessel]}
        onClose={() => setSheet(null)}
        onSave={(data) => {
          const editId = sheet?.kind === 'stent' ? sheet.editId : undefined
          commit({ id: nid(), at: Date.now(), kind: 'stent', data: { ...data, vessel } }, editId)
          if (!editId) setPostDil(suggestedPostDil({ ...data, vessel }))
        }}
      />
      <ImagingSheet
        lockVessel
        open={sheet?.kind === 'imaging'}
        initial={sheet?.kind === 'imaging' ? sheet.initial : { modality: 'IVUS', vessel, finding: '' }}
        targets={[vessel]}
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit(
            { id: nid(), at: Date.now(), kind: 'imaging', data: { ...data, vessel } },
            sheet?.kind === 'imaging' ? sheet.editId : undefined,
          )
        }
      />
      <BottomSheet
        nested
        open={Boolean(combinedStenosisFor)}
        title={combinedStenosisFor ? `${combinedStenosisFor} stenosis` : 'Stenosis'}
        onClose={() => setCombinedStenosisFor(null)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => combinedStenosisFor && removeCombinedVessel(combinedStenosisFor)}
            >
              Remove
            </Button>
            <Button className="flex-1" onClick={() => setCombinedStenosisFor(null)}>
              Done
            </Button>
          </div>
        }
      >
        {combinedStenosisFor ? (
          <StenosisPicker
            title="Stenosis"
            f={
              pciLesionForVessel(current.baselineAngio, combinedStenosisFor) ??
              draftPciLesion(combinedStenosisFor, DEFAULT_PCI_STENOSIS)
            }
            setF={(next) => setPartnerLesion(combinedStenosisFor, next)}
            unset={!pciLesionForVessel(current.baselineAngio, combinedStenosisFor)}
          />
        ) : null}
      </BottomSheet>
      <BottomSheet
        nested
        open={Boolean(postDil)}
        title="Add post-dilatation?"
        onClose={() => setPostDil(null)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPostDil(null)}>
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (!postDil) return
                addEvent({ id: nid(), at: Date.now(), kind: 'postdilatation', data: postDil })
                setPostDil(null)
              }}
            >
              Add NC balloon
            </Button>
          </div>
        }
      >
        {postDil ? (
          <p className="text-base leading-relaxed text-foreground">
            Suggest {postDil.name} {postDil.diameterMm.toFixed(2).replace(/0$/, '')} × {postDil.lengthMm} mm
            at {postDil.inflations[0]?.atm} atm — 0.25 mm larger than the stent.
          </p>
        ) : null}
      </BottomSheet>
    </div>
  )
}
