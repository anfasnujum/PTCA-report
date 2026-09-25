import {
  CAG_ADVICES,
  CAG_IMPRESSIONS,
  DEFAULT_WIRE_SIZE,
  GUIDE_SIZES,
  defaultAspirationSize,
  defaultGuideExtensionSize,
  defaultMicrocatheterSize,
} from '@/lib/constants'
import { formatContrastLabel, normalizeContrastAgent } from '@/lib/access'
import { defaultBalloonType, defaultDiameter, isRightCoronary } from '@/lib/format'
import { defaultGuideCatheter, parseGuideLabel } from '@/lib/guideCatheter'
import { nid } from '@/lib/ids'
import { defaultBalloon, lastLocation } from '@/lib/location'
import { upsertPciLesion, pciLesionForVessel, DEFAULT_PCI_STENOSIS } from '@/lib/pciLesion'
import { asNumber, asString, classifySpokenDevice, matchCatalogueName, parseSpokenMetrics, parseStenosis, resolveSegment, resolveSheathBrand, resolveSheathSize, resolveVessel } from '@/lib/voice/match'
import type { VoiceAction } from '@/lib/voice/schema'
import type {
  Access,
  AdjunctType,
  BalloonType,
  BalloonUse,
  CagAdvice,
  CagImpression,
  CatalogueCategory,
  CatalogueItem,
  Closure,
  EventKind,
  ImagingModality,
  Inflation,
  LabDetails,
  Outcome,
  Periprocedural,
  Procedure,
  ProcedureEvent,
  SegmentChoice,
  StentType,
  StentUse,
  Vessel,
  VesselPciKind,
} from '@/types/procedure'

const BALLOON_TYPES: BalloonType[] = [
  'semi-compliant',
  'non-compliant',
  'cutting',
  'scoring',
  'drug-coated',
]
const STENT_TYPES: StentType[] = ['DES', 'BMS', 'BVS', 'Covered']
const IMAGING: ImagingModality[] = ['IVUS', 'OCT', 'FFR', 'iFR']
const ADJUNCTS: AdjunctType[] = [
  'Thrombus aspiration',
  'Rotablation',
  'Cutting balloon',
  'IABP',
  'Temporary pacemaker',
  'Other',
]
const GUIDE_SIZE_SET = new Set<string>(GUIDE_SIZES)

function pickVessel(raw: unknown, procedure: Procedure, fallback?: Vessel): Vessel {
  return resolveVessel(raw) ?? fallback ?? lastLocation(procedure).vessel
}

function pickSegment(raw: unknown, procedure: Procedure, vessel: Vessel): SegmentChoice | undefined {
  return resolveSegment(raw) ?? lastLocation(procedure, vessel).segment
}

function inflationsOf(raw: unknown, fallback: Inflation[]): Inflation[] {
  if (!Array.isArray(raw) || !raw.length) return fallback
  return raw.map((item) => {
    const rec = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      atm: asNumber(rec.atm, fallback[0]?.atm ?? 10),
      seconds: asNumber(rec.seconds, fallback[0]?.seconds ?? 20),
    }
  })
}

function balloonFrom(
  procedure: Procedure,
  items: CatalogueItem[],
  data: Record<string, unknown> | undefined,
  kind: 'predilatation' | 'postdilatation' | 'lmcaPot',
): BalloonUse {
  const base = defaultBalloon(procedure, resolveVessel(data?.vessel))
  if (kind === 'postdilatation' || kind === 'lmcaPot') {
    base.name = 'NC Sapphire'
    base.type = 'non-compliant'
    base.diameterMm = Math.min(5, defaultDiameter(base.vessel, base.segment) + 0.25)
    base.lengthMm = 12
    base.inflations = [{ atm: 18, seconds: 15 }]
  }
  const vessel = pickVessel(data?.vessel, procedure, base.vessel)
  const metrics = parseSpokenMetrics(spokenDeviceBlob(data))
  const classified = classifySpokenDevice(spokenDeviceBlob(data), items)
  const nameSpoken = classified?.name || metrics.name || asString(data?.name, base.name)
  const name = matchCatalogueName(items, 'balloon', nameSpoken) || nameSpoken
  const typeRaw = asString(data?.type)
  const type = BALLOON_TYPES.includes(typeRaw as BalloonType)
    ? (typeRaw as BalloonType)
    : defaultBalloonType(name)
  const atmFallback = metrics.atm != null ? [{ atm: metrics.atm, seconds: 20 }] : base.inflations
  return {
    name,
    type,
    diameterMm: balloonMeasure(data?.diameterMm, metrics.diameterMm, base.diameterMm, 0.5, 6),
    lengthMm: balloonMeasure(data?.lengthMm, metrics.lengthMm, base.lengthMm, 6, 60),
    vessel,
    segment: pickSegment(data?.segment, procedure, vessel),
    inflations: inflationsOf(data?.inflations, atmFallback),
    result: asString(data?.result) || undefined,
  }
}

function stentFrom(
  procedure: Procedure,
  items: CatalogueItem[],
  data: Record<string, unknown> | undefined,
): StentUse {
  const loc = lastLocation(procedure, resolveVessel(data?.vessel))
  const metrics = parseSpokenMetrics(spokenDeviceBlob(data))
  const classified = classifySpokenDevice(spokenDeviceBlob(data), items)
  const nameSpoken = classified?.name || metrics.name || asString(data?.name, 'Supraflex Cruz')
  const typeRaw = asString(data?.type, 'DES')
  return {
    name: matchCatalogueName(items, 'stent', nameSpoken) || nameSpoken,
    type: STENT_TYPES.includes(typeRaw as StentType) ? (typeRaw as StentType) : 'DES',
    diameterMm: balloonMeasure(data?.diameterMm, metrics.diameterMm, defaultDiameter(loc.vessel, loc.segment), 0.5, 6),
    lengthMm: balloonMeasure(data?.lengthMm, metrics.lengthMm, 24, 6, 60),
    vessel: loc.vessel,
    segment: pickSegment(data?.segment, procedure, loc.vessel),
    deployedAtAtm: asNumber(data?.deployedAtAtm, 14),
    seconds: asNumber(data?.seconds, 20),
    overlapWithEventId: asString(data?.overlapWithEventId) || undefined,
    technique: asString(data?.technique) as StentUse['technique'],
    deployedToMm: data?.deployedToMm != null ? asNumber(data.deployedToMm, NaN) || undefined : undefined,
  }
}

function spokenDeviceBlob(data: Record<string, unknown> | undefined): string {
  if (!data) return ''
  return [data.name, data.device, data.curve, data.type, data.kind, data.size]
    .map((value) => asString(value))
    .filter(Boolean)
    .join(' ')
}

function kindFromCatalogue(
  category: CatalogueCategory,
  kind: EventKind | undefined,
  data: Record<string, unknown> | undefined,
): EventKind {
  switch (category) {
    case 'wire':
      return 'guidewire'
    case 'balloon':
      return inferBalloonKind(kind, data)
    case 'stent':
      return 'stent'
    case 'guide':
    case 'catheter':
      return 'guideCatheter'
    case 'microcatheter':
      return 'microcatheter'
    case 'aspiration':
      return 'thrombusAspiration'
    case 'guideExtension':
      return 'guideExtension'
    default:
      return kind && kind !== 'note' ? kind : inferBalloonKind(undefined, data)
  }
}

function resolveAddKind(
  kind: EventKind | undefined,
  data: Record<string, unknown> | undefined,
  items: CatalogueItem[],
): EventKind {
  const classified = classifySpokenDevice(spokenDeviceBlob(data), items)
  if (classified) return kindFromCatalogue(classified.category, kind, data)
  if (kind === 'predilatation' || kind === 'postdilatation' || kind === 'lmcaPot') return inferBalloonKind(kind, data)
  if (kind && kind !== 'note') return kind
  return inferBalloonKind(undefined, data)
}

function balloonMeasure(
  raw: unknown,
  parsed: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : asNumber(raw, Number.NaN)
  if (Number.isFinite(n) && n >= min && n <= max) return n
  if (parsed != null && parsed >= min && parsed <= max) return parsed
  return fallback
}

function inferBalloonKind(
  kind: EventKind | undefined,
  data: Record<string, unknown> | undefined,
): EventKind {
  if (kind === 'predilatation' || kind === 'postdilatation' || kind === 'lmcaPot') return kind
  const blob = `${asString(data?.role)} ${asString(data?.kind)} ${asString(data?.name)}`.toLowerCase()
  if (blob.includes('pot')) return 'lmcaPot'
  if (blob.includes('post') || blob.includes('nc ') || blob.includes('non-compliant')) return 'postdilatation'
  return 'predilatation'
}

function buildEvent(
  procedure: Procedure,
  items: CatalogueItem[],
  kind: EventKind,
  data: Record<string, unknown> | undefined,
): ProcedureEvent {
  const id = nid()
  const at = Date.now()
  const vessel = pickVessel(data?.vessel, procedure)

  switch (kind) {
    case 'predilatation':
    case 'postdilatation':
    case 'lmcaPot':
      return { id, at, kind, data: balloonFrom(procedure, items, data, kind) }
    case 'stent':
      return { id, at, kind, data: stentFrom(procedure, items, data) }
    case 'guidewire': {
      const classified = classifySpokenDevice(spokenDeviceBlob(data), items)
      const metrics = parseSpokenMetrics(spokenDeviceBlob(data))
      const nameSpoken = classified?.name || metrics.name || asString(data?.name, 'BMW')
      return {
        id,
        at,
        kind,
        data: {
          name: matchCatalogueName(items, 'wire', nameSpoken) || nameSpoken || 'BMW',
          type: asString(data?.type) as never,
          size: asString(data?.size, DEFAULT_WIRE_SIZE) || DEFAULT_WIRE_SIZE,
          vessel,
          parkedSegment: pickSegment(data?.parkedSegment ?? data?.segment, procedure, vessel),
        },
      }
    }
    case 'guideCatheter': {
      const sizeRaw = asString(data?.size, procedure.access.sheathSize)
      const size = GUIDE_SIZE_SET.has(sizeRaw) ? (sizeRaw as '5F' | '6F' | '7F' | '8F') : '6F'
      const parsed = parseGuideLabel(asString(data?.name) || asString(data?.curve) || asString(data?.device))
      const base = defaultGuideCatheter(size, isRightCoronary(vessel))
      return {
        id,
        at,
        kind,
        data: {
          device: asString(data?.device, parsed.device || base.device),
          curve: asString(data?.curve, parsed.curve || base.curve),
          size,
          coronary: asString(data?.coronary) === 'right' ? 'right' : 'left',
          vessel,
        },
      }
    }
    case 'thrombusAspiration':
      return {
        id,
        at,
        kind,
        data: {
          name: matchCatalogueName(items, 'aspiration', asString(data?.name, 'Export')) || 'Export',
          size: asString(data?.size) || defaultAspirationSize(asString(data?.name, 'Export')),
          vessel,
        },
      }
    case 'microcatheter':
      return {
        id,
        at,
        kind,
        data: {
          name: matchCatalogueName(items, 'microcatheter', asString(data?.name, 'Finecross')) || 'Finecross',
          size: asString(data?.size) || defaultMicrocatheterSize(asString(data?.name, 'Finecross')),
          vessel,
        },
      }
    case 'guideExtension':
      return {
        id,
        at,
        kind,
        data: {
          name: matchCatalogueName(items, 'guideExtension', asString(data?.name, 'GuideLiner')) || 'GuideLiner',
          size: asString(data?.size) || defaultGuideExtensionSize(asString(data?.name, 'GuideLiner')),
          vessel,
        },
      }
    case 'imaging': {
      const modalityRaw = asString(data?.modality, 'IVUS').toUpperCase()
      return {
        id,
        at,
        kind,
        data: {
          modality: IMAGING.includes(modalityRaw as ImagingModality)
            ? (modalityRaw as ImagingModality)
            : 'IVUS',
          vessel,
          finding: asString(data?.finding),
        },
      }
    }
    case 'adjunct': {
      const typeRaw = asString(data?.type, 'Other')
      return {
        id,
        at,
        kind,
        data: {
          type: ADJUNCTS.includes(typeRaw as AdjunctType) ? (typeRaw as AdjunctType) : 'Other',
          detail: asString(data?.detail),
        },
      }
    }
    case 'note':
      return { id, at, kind, data: { text: asString(data?.text) } }
    default:
      return { id, at, kind: 'note', data: { text: asString(data?.text) } }
  }
}

function mergeEventData(event: ProcedureEvent, patch: Record<string, unknown>, items: CatalogueItem[]): ProcedureEvent {
  const next = { ...event.data } as Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    if (key === 'vessel') {
      const vessel = resolveVessel(value)
      if (vessel) next.vessel = vessel
      continue
    }
    if (key === 'segment' || key === 'parkedSegment') {
      const segment = resolveSegment(value)
      if (segment) next[key] = segment
      continue
    }
    if (key === 'name' && (event.kind === 'predilatation' || event.kind === 'postdilatation' || event.kind === 'lmcaPot')) {
      next.name = matchCatalogueName(items, 'balloon', String(value))
      continue
    }
    if (key === 'name' && event.kind === 'stent') {
      next.name = matchCatalogueName(items, 'stent', String(value))
      continue
    }
    next[key] = value
  }
  return { ...event, data: next } as ProcedureEvent
}

function lastBalloon(procedure: Procedure, vessel?: Vessel): ProcedureEvent | undefined {
  for (let i = procedure.events.length - 1; i >= 0; i--) {
    const e = procedure.events[i]
    if (e.kind !== 'predilatation' && e.kind !== 'postdilatation' && e.kind !== 'lmcaPot') continue
    if (vessel && e.data.vessel !== vessel) continue
    return e
  }
  return undefined
}

function uniqueStrings(values: unknown, fallback: string[]): string[] {
  if (!Array.isArray(values)) return fallback
  const next = values.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map((v) => v.trim())
  return [...new Set(next)]
}

const CAG_IMPRESSION_IDS = new Set<string>(CAG_IMPRESSIONS.map((o) => o.id))
const CAG_ADVICE_IDS = new Set<string>(CAG_ADVICES.map((o) => o.id))

function listedIds<T extends string>(values: unknown, allowed: Set<string>, fallback: T[]): T[] {
  return uniqueStrings(values, fallback).filter((id): id is T => allowed.has(id))
}

export function applyVoiceActions(
  procedure: Procedure,
  actions: VoiceAction[],
  catalogue: CatalogueItem[],
): Procedure {
  let next = procedure
  for (const action of actions) {
    next = applyOne(next, action, catalogue)
  }
  return next
}

function applyOne(procedure: Procedure, action: VoiceAction, items: CatalogueItem[]): Procedure {
  const data = action.data ?? {}
  switch (action.op) {
    case 'add_event': {
      const kind = resolveAddKind(
        action.kind ?? (typeof data.kind === 'string' ? (data.kind as EventKind) : undefined),
        data,
        items,
      )
      return { ...procedure, events: [...procedure.events, buildEvent(procedure, items, kind, data)] }
    }
    case 'update_event': {
      const id = action.eventId
      if (!id) return procedure
      return {
        ...procedure,
        events: procedure.events.map((e) => (e.id === id ? mergeEventData(e, data, items) : e)),
      }
    }
    case 'remove_event': {
      const id = action.eventId
      if (!id) return procedure
      return { ...procedure, events: procedure.events.filter((e) => e.id !== id) }
    }
    case 'add_inflation': {
      const vessel = resolveVessel(action.vessel ?? data.vessel)
      const target =
        (action.eventId ? procedure.events.find((e) => e.id === action.eventId) : undefined) ??
        lastBalloon(procedure, vessel)
      if (!target || (target.kind !== 'predilatation' && target.kind !== 'postdilatation' && target.kind !== 'lmcaPot')) {
        return procedure
      }
      const last = target.data.inflations.at(-1) ?? { atm: 10, seconds: 20 }
      const inflation: Inflation = {
        atm: asNumber(data.atm, Math.min(26, last.atm + 2)),
        seconds: asNumber(data.seconds, last.seconds),
      }
      return {
        ...procedure,
        events: procedure.events.map((e) =>
          e.id === target.id
            ? { ...target, data: { ...target.data, inflations: [...target.data.inflations, inflation] } }
            : e,
        ),
      }
    }
    case 'upsert_finding': {
      const vessel = pickVessel(action.vessel ?? data.vessel, procedure)
      const existing = pciLesionForVessel(procedure.baselineAngio, vessel)
      const stenosis =
        parseStenosis(data.stenosis) ?? existing?.stenosis ?? DEFAULT_PCI_STENOSIS
      const spokenSegment = resolveSegment(data.segment)
      return {
        ...procedure,
        baselineAngio: upsertPciLesion(procedure.baselineAngio, vessel, {
          stenosis,
          stenosisMode: data.stenosisMode === 'range' ? 'range' : 'single',
          stenosisTo: data.stenosisTo != null ? asNumber(data.stenosisTo, stenosis) : undefined,
          stenosisRange: data.stenosisRange != null ? asNumber(data.stenosisRange, 10) : undefined,
          ...(spokenSegment !== undefined ? { segment: spokenSegment } : {}),
          features: Array.isArray(data.features)
            ? data.features.filter((f): f is string => typeof f === 'string')
            : undefined,
          descriptionCustom: asString(data.descriptionCustom) || undefined,
        }),
      }
    }
    case 'patch_patient':
      return { ...procedure, patient: { ...procedure.patient, ...data } as Procedure['patient'] }
    case 'patch_indication':
      return {
        ...procedure,
        indication: {
          ...procedure.indication,
          ...data,
          chips: uniqueStrings(data.chips, procedure.indication.chips),
          symptoms: uniqueStrings(data.symptoms, procedure.indication.symptoms),
        },
      }
    case 'patch_access': {
      const size = resolveSheathSize(data.sheathSize ?? data.size)
      const brand = resolveSheathBrand(data.sheathBrand ?? data.brand ?? data.name)
      return {
        ...procedure,
        access: {
          ...procedure.access,
          ...data,
          ...(size ? { sheathSize: size } : {}),
          ...(brand ? { sheathBrand: brand } : {}),
        } as Access,
      }
    }
    case 'patch_outcome':
      return { ...procedure, outcome: { ...procedure.outcome, ...data } as Outcome }
    case 'patch_periprocedural':
      return {
        ...procedure,
        periprocedural: { ...procedure.periprocedural, ...data } as Periprocedural,
      }
    case 'patch_closure':
      return { ...procedure, closure: { ...procedure.closure, ...data } as Closure }
    case 'patch_lab': {
      const nextData = { ...data }
      const catheter = asString(data.catheter)
      if (catheter) {
        const classified = classifySpokenDevice(catheter, items)
        if (classified?.category === 'wire' || classified?.category === 'balloon' || classified?.category === 'stent') {
          delete nextData.catheter
        }
      }
      return { ...procedure, lab: { ...procedure.lab, ...nextData } as LabDetails }
    }
    case 'patch_contrast': {
      const existing = procedure.lab.contrast
      const spokenAgent = normalizeContrastAgent(asString(data.agent) || asString(data.contrast))
      const volumeRaw = data.volumeMl ?? data.contrastVolumeMl
      const volumeMl =
        volumeRaw === '' || volumeRaw == null
          ? ('' as const)
          : asNumber(volumeRaw, typeof volumeRaw === 'number' ? volumeRaw : NaN)
      const volume = Number.isFinite(volumeMl) ? volumeMl : ('' as const)
      const label = formatContrastLabel(spokenAgent, volume)
      const parsedAgent = spokenAgent || normalizeContrastAgent(existing)
      return {
        ...procedure,
        lab: { ...procedure.lab, contrast: label || existing },
        periprocedural: {
          ...procedure.periprocedural,
          contrastAgent: parsedAgent || procedure.periprocedural.contrastAgent,
          contrastVolumeMl: volume === '' ? procedure.periprocedural.contrastVolumeMl : volume,
        },
      }
    }
    case 'patch_operators':
      return {
        ...procedure,
        mainOperator: asString(data.mainOperator, procedure.mainOperator) || procedure.mainOperator,
        assistantOperator:
          asString(data.assistantOperator, procedure.assistantOperator) || procedure.assistantOperator,
      }
    case 'set_notes': {
      const text = asString(data.text)
      const mode = asString(data.mode, 'replace')
      return {
        ...procedure,
        notes: mode === 'append' && procedure.notes ? `${procedure.notes}\n${text}` : text,
      }
    }
    case 'patch_cag':
      return {
        ...procedure,
        cagImpressions: listedIds<CagImpression>(data.impressions, CAG_IMPRESSION_IDS, procedure.cagImpressions ?? []),
        cagCustomImpressions: uniqueStrings(data.customImpressions, procedure.cagCustomImpressions ?? []),
        cagAdvices: listedIds<CagAdvice>(data.advices, CAG_ADVICE_IDS, procedure.cagAdvices ?? []),
        cagCustomAdvices: uniqueStrings(data.customAdvices, procedure.cagCustomAdvices ?? []),
        cagLimaOn: typeof data.limaOn === 'boolean' ? data.limaOn : procedure.cagLimaOn,
        cagLimaNote: asString(data.limaNote, procedure.cagLimaNote ?? '') || procedure.cagLimaNote,
        cagRimaOn: typeof data.rimaOn === 'boolean' ? data.rimaOn : procedure.cagRimaOn,
        cagRimaNote: asString(data.rimaNote, procedure.cagRimaNote ?? '') || procedure.cagRimaNote,
      }
    case 'set_vessel_pci_kind': {
      const vessel = resolveVessel(action.vessel ?? data.vessel)
      const kind = asString(data.kind) === 'POBA' ? 'POBA' : 'PTCA'
      if (!vessel) return procedure
      return {
        ...procedure,
        vesselPciKind: { ...procedure.vesselPciKind, [vessel]: kind as VesselPciKind },
      }
    }
    default:
      return procedure
  }
}

export function catalogueTouches(actions: VoiceAction[]): Array<{ category: CatalogueItem['category']; name: string }> {
  const out: Array<{ category: CatalogueItem['category']; name: string }> = []
  for (const action of actions) {
    if (action.op !== 'add_event' && action.op !== 'update_event') continue
    const name = asString(action.data?.name)
    if (!name) continue
    const kind = action.kind
    if (kind === 'stent') out.push({ category: 'stent', name })
    else if (kind === 'predilatation' || kind === 'postdilatation' || kind === 'lmcaPot') {
      out.push({ category: 'balloon', name })
    } else if (kind === 'guidewire') out.push({ category: 'wire', name })
    else if (kind === 'guideCatheter') out.push({ category: 'guide', name })
    else if (kind === 'thrombusAspiration') out.push({ category: 'aspiration', name })
    else if (kind === 'microcatheter') out.push({ category: 'microcatheter', name })
    else if (kind === 'guideExtension') out.push({ category: 'guideExtension', name })
  }
  return out
}
