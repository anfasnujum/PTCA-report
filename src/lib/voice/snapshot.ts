import { summarizeEvent } from '@/lib/eventSummary'
import { CAG_ADVICES, CAG_IMPRESSIONS } from '@/lib/constants'
import type { CatalogueItem, Procedure } from '@/types/procedure'

const MAX_CATALOGUE = 18

export type VoiceSnapshot = {
  kind: string
  patient: {
    name: string
    hospitalId: string
    age: number | ''
    sex: string
    date: string
  }
  indication: Procedure['indication']
  access: Procedure['access']
  contrast: string
  findings: Array<{
    id: string
    vessel: string
    segment?: unknown
    stenosis: number
    findingType?: string
    isTarget: boolean
  }>
  events: Array<{ id: string; kind: string; summary: string }>
  outcome: Procedure['outcome']
  periprocedural: Procedure['periprocedural']
  closure: Procedure['closure']
  operators: { main: string; assistant: string }
  lab: Procedure['lab']
  notes: string
  cag: {
    impressions: string[]
    customImpressions: string[]
    advices: string[]
    customAdvices: string[]
  }
  vesselPciKind: Procedure['vesselPciKind']
  catalogue: Record<string, string[]>
  enums: {
    vessels: string[]
    sheathBrands: string[]
    cagImpressions: string[]
    cagAdvices: string[]
  }
}

export function buildVoiceSnapshot(procedure: Procedure, catalogue: CatalogueItem[]): VoiceSnapshot {
  const catalogueByCat: Record<string, string[]> = {}
  for (const item of catalogue) {
    const list = catalogueByCat[item.category] ?? []
    if (list.length < MAX_CATALOGUE) list.push(item.name)
    catalogueByCat[item.category] = list
  }
  return {
    kind: procedure.kind === 'cag' ? 'cag' : 'ptca',
    patient: {
      name: procedure.patient.name,
      hospitalId: procedure.patient.hospitalId,
      age: procedure.patient.age,
      sex: procedure.patient.sex,
      date: procedure.patient.date,
    },
    indication: procedure.indication,
    access: procedure.access,
    contrast: procedure.lab.contrast,
    findings: procedure.baselineAngio.map((f) => ({
      id: f.id,
      vessel: f.vessel,
      segment: f.segment,
      stenosis: f.stenosis,
      findingType: f.findingType,
      isTarget: f.isTarget,
    })),
    events: procedure.events.map((e) => ({
      id: e.id,
      kind: e.kind,
      summary: summarizeEvent(e),
    })),
    outcome: procedure.outcome,
    periprocedural: procedure.periprocedural,
    closure: procedure.closure,
    operators: { main: procedure.mainOperator, assistant: procedure.assistantOperator },
    lab: procedure.lab,
    notes: procedure.notes,
    cag: {
      impressions: procedure.cagImpressions ?? [],
      customImpressions: procedure.cagCustomImpressions ?? [],
      advices: procedure.cagAdvices ?? [],
      customAdvices: procedure.cagCustomAdvices ?? [],
    },
    vesselPciKind: procedure.vesselPciKind,
    catalogue: catalogueByCat,
    enums: {
      vessels: [
        'LMCA',
        'LAD',
        'D1',
        'D2',
        'D3',
        'S1',
        'LCX',
        'OM1',
        'OM2',
        'OM3',
        'LPDA',
        'Ramus',
        'RCA',
        'Conus',
        'AM',
        'PDA',
        'PLV',
      ],
      sheathBrands: ['Radifocus Terumo', 'Glidesheath Slender', 'Prelude Ease', 'Avanti+', 'Input', 'Terumo Introducer'],
      cagImpressions: CAG_IMPRESSIONS.map((o) => o.id),
      cagAdvices: CAG_ADVICES.map((o) => o.id),
    },
  }
}
