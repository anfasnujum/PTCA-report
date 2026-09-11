import { useMemo, useState } from 'react'
import { ActionBar } from '@/components/timeline/ActionBar'
import { TimelineList } from '@/components/timeline/TimelineList'
import { BalloonSheet } from '@/components/sheets/BalloonSheet'
import { StentSheet } from '@/components/sheets/StentSheet'
import { GuideSheet } from '@/components/sheets/GuideSheet'
import { WireSheet } from '@/components/sheets/WireSheet'
import { ImagingSheet } from '@/components/sheets/ImagingSheet'
import { AdjunctSheet } from '@/components/sheets/AdjunctSheet'
import { NoteEventSheet } from '@/components/sheets/NoteEventSheet'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { useProcedureStore } from '@/store/useProcedureStore'
import { nid } from '@/lib/ids'
import { defaultBalloon, lastLocation, targetVessels } from '@/lib/location'
import { defaultDiameter } from '@/lib/format'
import { suggestedPostDil } from '@/lib/noteTemplate'
import type {
  AdjunctUse,
  BalloonUse,
  EventKind,
  GuideCatheter,
  Guidewire,
  ImagingUse,
  ProcedureEvent,
  StentUse,
} from '@/types/procedure'

type Sheet =
  | { kind: 'guideCatheter'; initial: GuideCatheter; editId?: string }
  | { kind: 'guidewire'; initial: Guidewire; editId?: string }
  | { kind: 'predilatation' | 'postdilatation'; initial: BalloonUse; editId?: string }
  | { kind: 'stent'; initial: StentUse; editId?: string }
  | { kind: 'imaging'; initial: ImagingUse; editId?: string }
  | { kind: 'adjunct'; initial: AdjunctUse; editId?: string }
  | { kind: 'note'; initial: string; editId?: string }

export function TimelinePage() {
  const current = useProcedureStore((s) => s.current)
  const addEvent = useProcedureStore((s) => s.addEvent)
  const updateEvent = useProcedureStore((s) => s.updateEvent)
  const removeEvent = useProcedureStore((s) => s.removeEvent)
  const reorderEvents = useProcedureStore((s) => s.reorderEvents)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [postDil, setPostDil] = useState<BalloonUse | null>(null)

  const targets = useMemo(() => (current ? targetVessels(current) : []), [current])

  if (!current) return null

  const loc = lastLocation(current)

  const commit = (event: ProcedureEvent, editId?: string) => {
    if (editId) updateEvent(editId, { ...event, id: editId })
    else addEvent(event)
    setSheet(null)
  }

  const openNew = (kind: EventKind | 'note') => {
    if (kind === 'guideCatheter') {
      setSheet({
        kind,
        initial: {
          curve: loc.vessel === 'RCA' || loc.vessel === 'PDA' || loc.vessel === 'PLV' ? 'JR4' : 'EBU 3.5',
          size: current.access.sheathSize || '6F',
          coronary: loc.vessel === 'RCA' || loc.vessel === 'PDA' || loc.vessel === 'PLV' ? 'right' : 'left',
        },
      })
      return
    }
    if (kind === 'guidewire') {
      setSheet({
        kind,
        initial: { name: 'BMW', type: 'workhorse', vessel: loc.vessel, parkedSegment: 'distal' },
      })
      return
    }
    if (kind === 'predilatation' || kind === 'postdilatation') {
      const b = defaultBalloon(current)
      if (kind === 'postdilatation') {
        b.name = 'NC Sapphire'
        b.type = 'non-compliant'
        b.diameterMm = Math.min(5, defaultDiameter(loc.vessel, loc.segment) + 0.25)
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
          diameterMm: defaultDiameter(loc.vessel, loc.segment),
          lengthMm: 24,
          vessel: loc.vessel,
          segment: loc.segment,
          deployedAtAtm: 14,
          seconds: 20,
          technique: current.events.some((e) => e.kind === 'predilatation')
            ? 'After predilatation'
            : 'Direct stenting',
        },
      })
      return
    }
    if (kind === 'imaging') {
      setSheet({ kind, initial: { modality: 'IVUS', vessel: loc.vessel, finding: '' } })
      return
    }
    if (kind === 'adjunct') {
      setSheet({ kind, initial: { type: 'Thrombus aspiration', detail: '' } })
      return
    }
    setSheet({ kind: 'note', initial: '' })
  }

  const openEdit = (e: ProcedureEvent) => {
    switch (e.kind) {
      case 'guideCatheter':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id })
        break
      case 'guidewire':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id })
        break
      case 'predilatation':
      case 'postdilatation':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id })
        break
      case 'stent':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id })
        break
      case 'imaging':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id })
        break
      case 'adjunct':
        setSheet({ kind: e.kind, initial: e.data, editId: e.id })
        break
      case 'note':
        setSheet({ kind: 'note', initial: e.data.text, editId: e.id })
        break
      default:
        break
    }
  }

  const duplicate = (e: ProcedureEvent) => {
    addEvent({ ...e, id: nid(), at: Date.now() })
  }

  const repeatInflation = (e: ProcedureEvent) => {
    if (e.kind !== 'predilatation' && e.kind !== 'postdilatation') return
    const last = e.data.inflations.at(-1) ?? { atm: 10, seconds: 15 }
    updateEvent(e.id, {
      ...e,
      data: {
        ...e.data,
        inflations: [...e.data.inflations, { atm: Math.min(26, last.atm + 2), seconds: last.seconds }],
      },
    })
  }

  return (
    <div className="pb-28">
      <p className="mb-3 text-sm text-muted">
        Log hardware in the order it happens. Drag to reorder. Repeat on a balloon adds another inflation.
      </p>
      <TimelineList
        events={current.events}
        onReorder={reorderEvents}
        onEdit={openEdit}
        onDelete={removeEvent}
        onRepeat={repeatInflation}
        onDuplicate={duplicate}
      />
      <ActionBar onAdd={openNew} />

      <GuideSheet
        open={sheet?.kind === 'guideCatheter'}
        initial={sheet?.kind === 'guideCatheter' ? sheet.initial : { curve: 'JR4', size: '6F', coronary: 'right' }}
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit({ id: nid(), at: Date.now(), kind: 'guideCatheter', data }, sheet?.kind === 'guideCatheter' ? sheet.editId : undefined)
        }
      />
      <WireSheet
        open={sheet?.kind === 'guidewire'}
        initial={
          sheet?.kind === 'guidewire'
            ? sheet.initial
            : { name: 'BMW', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' }
        }
        targets={targets}
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit({ id: nid(), at: Date.now(), kind: 'guidewire', data }, sheet?.kind === 'guidewire' ? sheet.editId : undefined)
        }
      />
      <BalloonSheet
        open={sheet?.kind === 'predilatation' || sheet?.kind === 'postdilatation'}
        title={sheet?.kind === 'postdilatation' ? 'Post-dilatation' : 'Balloon / predilatation'}
        initial={
          sheet?.kind === 'predilatation' || sheet?.kind === 'postdilatation'
            ? sheet.initial
            : defaultBalloon(current)
        }
        targets={targets}
        onClose={() => setSheet(null)}
        onSave={(data) => {
          const kind = sheet?.kind === 'postdilatation' ? 'postdilatation' : 'predilatation'
          commit(
            { id: nid(), at: Date.now(), kind, data },
            sheet?.kind === 'predilatation' || sheet?.kind === 'postdilatation'
              ? sheet.editId
              : undefined,
          )
        }}
      />
      <StentSheet
        open={sheet?.kind === 'stent'}
        initial={
          sheet?.kind === 'stent'
            ? sheet.initial
            : {
                name: 'Supraflex Cruz',
                type: 'DES',
                diameterMm: 3.0,
                lengthMm: 24,
                vessel: 'LAD',
                segment: 'mid',
                deployedAtAtm: 14,
                seconds: 20,
              }
        }
        procedure={current}
        targets={targets}
        onClose={() => setSheet(null)}
        onSave={(data) => {
          const editId = sheet?.kind === 'stent' ? sheet.editId : undefined
          commit({ id: nid(), at: Date.now(), kind: 'stent', data }, editId)
          if (!editId) setPostDil(suggestedPostDil(data))
        }}
      />
      <ImagingSheet
        open={sheet?.kind === 'imaging'}
        initial={sheet?.kind === 'imaging' ? sheet.initial : { modality: 'IVUS', vessel: 'RCA', finding: '' }}
        targets={targets}
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit({ id: nid(), at: Date.now(), kind: 'imaging', data }, sheet?.kind === 'imaging' ? sheet.editId : undefined)
        }
      />
      <AdjunctSheet
        open={sheet?.kind === 'adjunct'}
        initial={sheet?.kind === 'adjunct' ? sheet.initial : { type: 'Thrombus aspiration', detail: '' }}
        onClose={() => setSheet(null)}
        onSave={(data) =>
          commit({ id: nid(), at: Date.now(), kind: 'adjunct', data }, sheet?.kind === 'adjunct' ? sheet.editId : undefined)
        }
      />
      <NoteEventSheet
        open={sheet?.kind === 'note'}
        initial={sheet?.kind === 'note' ? sheet.initial : ''}
        onClose={() => setSheet(null)}
        onSave={(text) =>
          commit({ id: nid(), at: Date.now(), kind: 'note', data: { text } }, sheet?.kind === 'note' ? sheet.editId : undefined)
        }
      />
      <BottomSheet
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
