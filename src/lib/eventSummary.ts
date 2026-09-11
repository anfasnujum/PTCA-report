import { fmtSize, locationShort } from '@/lib/format'
import type { ProcedureEvent } from '@/types/procedure'

export function eventTitle(kind: ProcedureEvent['kind']): string {
  switch (kind) {
    case 'guideCatheter':
      return 'Guide'
    case 'guidewire':
      return 'Wire'
    case 'predilatation':
      return 'Balloon'
    case 'stent':
      return 'Stent'
    case 'postdilatation':
      return 'Post-dil'
    case 'imaging':
      return 'Imaging'
    case 'adjunct':
      return 'Adjunct'
    case 'note':
      return 'Note'
    default:
      return 'Event'
  }
}

export function summarizeEvent(e: ProcedureEvent): string {
  switch (e.kind) {
    case 'guideCatheter':
      return `${e.data.size} ${e.data.curve}, ${e.data.coronary}`
    case 'guidewire':
      return `${e.data.name} · ${e.data.vessel}`
    case 'predilatation':
    case 'postdilatation': {
      const n = e.data.inflations.length
      const atm = e.data.inflations[0]?.atm
      const loc = locationShort(e.data.vessel, e.data.segment)
      const extra = n > 1 ? ` ×${n}` : atm != null ? ` @ ${atm} atm` : ''
      return `${e.data.name} ${fmtSize(e.data.diameterMm, e.data.lengthMm)}, ${loc}${extra}`
    }
    case 'stent': {
      const loc = locationShort(e.data.vessel, e.data.segment)
      return `${e.data.name} ${fmtSize(e.data.diameterMm, e.data.lengthMm)}, ${loc} @ ${e.data.deployedAtAtm} atm`
    }
    case 'imaging':
      return `${e.data.modality}, ${e.data.vessel}`
    case 'adjunct':
      return e.data.type + (e.data.detail ? ` — ${e.data.detail}` : '')
    case 'note':
      return e.data.text.slice(0, 80) || 'Free text'
    default:
      return ''
  }
}
