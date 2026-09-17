import {
  asSegments,
  featureLabel,
  fmtMm,
  formatStenosis,
  isRightCoronary,
  stenosisModeOf,
  timiRoman,
  VESSELS,
  vesselReportName,
} from '@/lib/format'
import { parseContrastLabel } from '@/lib/access'
import { ANGIO_FEATURES, wireSizeOf } from '@/lib/constants'
import { pciLesionForVessel } from '@/lib/pciLesion'
import { coronaryFromDevice, formatGuideLabel, normalizeGuideCatheter } from '@/lib/guideCatheter'
import { hasStentEvents } from '@/lib/noteTemplate'
import type {
  Access,
  AngioFinding,
  BalloonUse,
  GuideCatheter,
  Guidewire,
  NamedDeviceUse,
  Outcome,
  Periprocedural,
  Procedure,
  ProcedureEvent,
  Segment,
  StentUse,
  Vessel,
  VesselPciKind,
} from '@/types/procedure'

export type InventoryLine = { label: string; value: string }

export type InventoryBlock = {
  vessel?: Vessel
  heading: string
  lines: InventoryLine[]
}

/** Widest inventory label; used so colons stay aligned even when this row is omitted. */
export const LONGEST_INVENTORY_LABEL = 'Post dilatation balloon'

const EMPTY_INVENTORY_LINES: InventoryLine[] = [
  { label: 'Sheath', value: '' },
  { label: 'Catheter', value: '' },
  { label: 'Guide wire', value: '' },
  { label: 'Pre dilatation balloon', value: '' },
  { label: 'Stent', value: '' },
  { label: 'Post dilatation balloon', value: '' },
]

function shortVesselCode(vessel: string): string {
  return vessel === 'LMCA' ? 'LM' : vessel
}

function capitalise(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function targetFeaturePhrase(f: AngioFinding): string {
  const known = new Set<string>(ANGIO_FEATURES)
  const ordered = [
    ...ANGIO_FEATURES.filter((feat) => f.features.includes(feat)),
    ...f.features.filter((feat) => !known.has(feat)),
  ]
  return ordered.map(featureLabel).join(', ')
}

function targetLesionLabel(vessel: Vessel, f?: AngioFinding): string {
  const code = shortVesselCode(f ? vesselReportName(f) : vessel)
  if (!f) return code
  if (!f.isTarget && stenosisModeOf(f) === 'single' && f.stenosis === 0) return code
  const feats = targetFeaturePhrase(f)
  const stenosis = `(${formatStenosis(f)})`
  return feats ? `${code} ${feats} ${stenosis}` : `${code} ${stenosis}`
}

function pciTargetVessels(procedure: Procedure): Vessel[] {
  const ordered: Vessel[] = []
  const seen = new Set<Vessel>()
  const add = (vessel?: Vessel) => {
    if (!vessel || seen.has(vessel)) return
    seen.add(vessel)
    ordered.push(vessel)
  }
  for (const vessel of pciVessels(procedure)) {
    add(vessel)
    for (const partner of combinedProcessVessels(procedure, vessel)) add(partner)
  }
  for (const f of procedure.baselineAngio) {
    if (f.isTarget) add(f.vessel)
  }
  return ordered
}

export function targetVesselsShort(procedure: Procedure): string {
  const vessels = pciTargetVessels(procedure)
  return vessels.length ? vessels.map((v) => shortVesselCode(v)).join(' - ') : '____'
}

export function targetVesselsLesions(procedure: Procedure): string {
  const vessels = pciTargetVessels(procedure)
  if (!vessels.length) return '____'
  const labels = vessels.map((vessel) =>
    targetLesionLabel(vessel, pciLesionForVessel(procedure.baselineAngio, vessel)),
  )
  if (labels.length === 1) return labels[0]
  return labels.join(' and ')
}

export function ptcaTitle(procedure: Procedure): string {
  if (procedure.indication.pciType === 'Primary') return '1° PTCA REPORT'
  return 'PTCA REPORT'
}

export function accessShortCode(access: Access): string {
  const sideCode = access.side === 'right' ? 'R' : access.side === 'left' ? 'L' : ''
  const siteCode =
    access.site === 'radial' || access.site === 'distal radial'
      ? 'R'
      : access.site === 'femoral'
        ? 'F'
        : access.site === 'brachial'
          ? 'B'
          : access.site === 'ulnar'
            ? 'U'
            : ''
  if (!sideCode || !siteCode) return '____'
  return `${sideCode}${siteCode}A`
}

export function sheathInventoryValue(access: Access): string {
  const size = access.sheathSize?.trim() ?? ''
  const brand = access.sheathBrand?.trim() ?? ''
  return [size, brand].filter(Boolean).join(' ')
}

function balloonSize(b: Pick<BalloonUse, 'diameterMm' | 'lengthMm'>): string {
  return `${fmtMm(b.diameterMm)}x${b.lengthMm}mm`
}

function stentSize(s: Pick<StentUse, 'diameterMm' | 'lengthMm'>): string {
  return `${fmtMm(s.diameterMm)} x ${s.lengthMm}mm`
}

function balloonInventory(b: BalloonUse): string {
  const atms = b.inflations.map((i) => i.atm).filter((n) => n !== undefined && n !== null)
  const atmPart = atms.length ? ` @ ${atms.join(', ')} atm` : ''
  return `${balloonSize(b)} ${b.name}${atmPart}`
}

function stentInventory(s: StentUse): string {
  const atm = s.deployedAtAtm ? ` @ ${s.deployedAtAtm} atm` : ''
  const to = deployedToPhrase(s)
  return `${stentSize(s)} ${s.name}${atm}${to}`
}

function wireInventory(w: Guidewire): string {
  return `${wireSizeOf(w.size)} ${w.name}`
}

function guideInventory(g: GuideCatheter): string {
  const guide = normalizeGuideCatheter(g)
  return `${guide.size} ${formatGuideLabel(guide)}`
}

function inventoryJoin(values: string[]): string {
  return values.filter(Boolean).join('\n')
}

function coronaryOf(vessel: Vessel): 'left' | 'right' {
  return isRightCoronary(vessel) ? 'right' : 'left'
}

function pciVessels(procedure: Procedure): Vessel[] {
  const seen = new Set<Vessel>()
  const ordered: Vessel[] = []
  const add = (vessel?: Vessel) => {
    if (!vessel || seen.has(vessel)) return
    seen.add(vessel)
    ordered.push(vessel)
  }
  for (const e of procedure.events) {
    switch (e.kind) {
      case 'guidewire':
      case 'thrombusAspiration':
      case 'microcatheter':
      case 'guideExtension':
      case 'predilatation':
      case 'postdilatation':
      case 'stent':
      case 'lmcaPot':
      case 'imaging':
        add(e.data.vessel)
        break
      case 'guideCatheter':
        add(e.data.vessel)
        break
    }
  }
  for (const f of procedure.baselineAngio) {
    if (f.isTarget) add(f.vessel)
  }
  for (const vessel of Object.keys(procedure.vesselPciKind ?? {}) as Vessel[]) {
    add(vessel)
  }
  for (const vessel of Object.keys(procedure.vesselCombined ?? {}) as Vessel[]) {
    if (procedure.vesselCombined?.[vessel]?.on) add(vessel)
  }
  return ordered
}

function eventsOf<K extends ProcedureEvent['kind']>(
  events: ProcedureEvent[],
  kind: K,
): Extract<ProcedureEvent, { kind: K }>[] {
  return events.filter((e): e is Extract<ProcedureEvent, { kind: K }> => e.kind === kind)
}

function matchingGuides(procedure: Procedure, vessel: Vessel): GuideCatheter[] {
  const guides = eventsOf(procedure.events, 'guideCatheter').map((e) => normalizeGuideCatheter(e.data))
  const assigned = guides.filter((g) => g.vessel === vessel)
  if (assigned.length) return assigned
  const side = coronaryOf(vessel)
  const inferred = guides.filter((g) => !g.vessel && coronaryFromDevice(g.device || '') === side)
  return inferred.length ? inferred : guides.filter((g) => !g.vessel)
}

function namedInventory(d: NamedDeviceUse): string {
  return [d.name, d.size].filter(Boolean).join(' ')
}

type VesselHardware = {
  vessel: Vessel
  guides: GuideCatheter[]
  aspirations: NamedDeviceUse[]
  microcatheters: NamedDeviceUse[]
  wires: Guidewire[]
  extensions: NamedDeviceUse[]
  predils: BalloonUse[]
  stents: StentUse[]
  postdils: BalloonUse[]
  pots: BalloonUse[]
  imaging: Extract<ProcedureEvent, { kind: 'imaging' }>['data'][]
}

function devicesOnVessel(
  procedure: Procedure,
  kind: 'thrombusAspiration' | 'microcatheter' | 'guideExtension',
  vessel: Vessel,
): NamedDeviceUse[] {
  return eventsOf(procedure.events, kind)
    .map((e) => e.data)
    .filter((d) => d.vessel === vessel)
}

function hardwareForVessel(procedure: Procedure, vessel: Vessel): VesselHardware {
  return {
    vessel,
    guides: matchingGuides(procedure, vessel),
    aspirations: devicesOnVessel(procedure, 'thrombusAspiration', vessel),
    microcatheters: devicesOnVessel(procedure, 'microcatheter', vessel),
    wires: eventsOf(procedure.events, 'guidewire')
      .map((e) => e.data)
      .filter((d) => d.vessel === vessel),
    extensions: devicesOnVessel(procedure, 'guideExtension', vessel),
    predils: eventsOf(procedure.events, 'predilatation')
      .map((e) => e.data)
      .filter((d) => d.vessel === vessel),
    stents: eventsOf(procedure.events, 'stent')
      .map((e) => e.data)
      .filter((d) => d.vessel === vessel),
    postdils: eventsOf(procedure.events, 'postdilatation')
      .map((e) => e.data)
      .filter((d) => d.vessel === vessel),
    pots: eventsOf(procedure.events, 'lmcaPot')
      .map((e) => e.data)
      .filter((d) => d.vessel === vessel),
    imaging: eventsOf(procedure.events, 'imaging')
      .map((e) => e.data)
      .filter((d) => d.vessel === vessel),
  }
}

const OPTIONAL_INVENTORY_LABELS = new Set([
  'Thrombus aspiration',
  'Microcatheter',
  'Guide extension',
  'LMCA POT',
])

function inventoryLinesFor(procedure: Procedure, hw: VesselHardware | null): InventoryLine[] {
  const lines = !hw
    ? EMPTY_INVENTORY_LINES.map((line) => ({ ...line }))
    : [
        { label: 'Sheath', value: sheathInventoryValue(procedure.access) },
        { label: 'Catheter', value: inventoryJoin(hw.guides.map(guideInventory)) },
        { label: 'Thrombus aspiration', value: inventoryJoin(hw.aspirations.map(namedInventory)) },
        { label: 'Microcatheter', value: inventoryJoin(hw.microcatheters.map(namedInventory)) },
        { label: 'Guide wire', value: inventoryJoin(hw.wires.map(wireInventory)) },
        { label: 'Guide extension', value: inventoryJoin(hw.extensions.map(namedInventory)) },
        { label: 'Pre dilatation balloon', value: inventoryJoin(hw.predils.map(balloonInventory)) },
        { label: 'Stent', value: inventoryJoin(hw.stents.map(stentInventory)) },
        { label: 'Post dilatation balloon', value: inventoryJoin(hw.postdils.map(balloonInventory)) },
        { label: 'LMCA POT', value: inventoryJoin(hw.pots.map(balloonInventory)) },
      ]
  return lines.filter((line) => line.value || !OPTIONAL_INVENTORY_LABELS.has(line.label))
}

export function vesselPciKind(procedure: Procedure, vessel: Vessel): VesselPciKind {
  return procedure.vesselPciKind?.[vessel] === 'POBA' ? 'POBA' : 'PTCA'
}

export function combinedProcessVessels(procedure: Procedure, vessel: Vessel): Vessel[] {
  const spec = procedure.vesselCombined?.[vessel]
  if (!spec?.on) return []
  const chosen = new Set(spec.vessels.filter((item) => item && item !== vessel))
  return VESSELS.filter((item) => chosen.has(item))
}

export function pciInventoryHeading(
  kind: VesselPciKind,
  vessel?: Vessel,
  combined: readonly Vessel[] = [],
): string {
  if (!vessel) return `${kind} →`
  const names = [vessel, ...combined.filter((item) => item && item !== vessel)]
  return `${kind} → ${names.join(' - ')}`
}

export function ptcaInventoryBlocks(procedure: Procedure): InventoryBlock[] {
  const vessels = pciVessels(procedure)
  if (!vessels.length) {
    return [
      {
        heading: pciInventoryHeading('PTCA'),
        lines: inventoryLinesFor(procedure, null),
      },
    ]
  }
  return vessels.map((vessel) => {
    const hw = hardwareForVessel(procedure, vessel)
    return {
      vessel,
      heading: pciInventoryHeading(
        vesselPciKind(procedure, vessel),
        hw.vessel,
        combinedProcessVessels(procedure, vessel),
      ),
      lines: inventoryLinesFor(procedure, hw),
    }
  })
}

export function ptcaInventorySummary(procedure: Procedure): string {
  return ptcaInventoryBlocks(procedure)[0]?.heading || 'PTCA'
}

export function ptcaInventoryLines(procedure: Procedure): InventoryLine[] {
  return ptcaInventoryBlocks(procedure)[0]?.lines.filter((l) => l.value) ?? []
}

export function ptcaResultLabel(outcome: Outcome): string {
  return outcome.residualStenosis === 0 && outcome.finalTimiFlow === 3 ? 'Good' : 'Suboptimal'
}

export function ptcaComplicationsText(outcome: Outcome): string {
  const comps = outcome.complications.filter((c) => c && c !== 'none')
  return comps.length ? comps.join(', ') : 'Nil'
}

export function ptcaAdjuvantsText(peri: Periprocedural): string {
  const bits: string[] = []
  if (peri.heparinIU !== '') bits.push(`Heparin ${peri.heparinIU} IU`)
  if (peri.gp2b3a && peri.gp2b3a !== 'none') bits.push(`GP IIb/IIIa: ${peri.gp2b3a}`)
  return bits.length ? bits.join(', ') : '____'
}

export function ptcaContrastText(procedure: Procedure): string {
  const lab = procedure.lab?.contrast?.trim() ?? ''
  if (lab) {
    const { agent, volumeMl } = parseContrastLabel(lab)
    if (agent && volumeMl !== '') return `${volumeMl} ml ${agent}`
    return lab
  }
  const peri = procedure.periprocedural
  if (!peri.contrastAgent && peri.contrastVolumeMl === '') return '____'
  if (peri.contrastAgent && peri.contrastVolumeMl !== '') {
    return `${peri.contrastVolumeMl} ml ${peri.contrastAgent}`
  }
  const vol = peri.contrastVolumeMl === '' ? '' : ` ${peri.contrastVolumeMl} ml`
  return `${peri.contrastAgent || 'Contrast'}${vol}`
}

function desCount(procedure: Procedure): number {
  return eventsOf(procedure.events, 'stent').filter((e) => e.data.type === 'DES').length
}

export function ptcaCommentSentence(procedure: Procedure): string {
  const listed = pciTargetVessels(procedure)
  const vessels = targetVesselsShort(procedure).toUpperCase()
  const des = desCount(procedure)
  if (hasStentEvents(procedure.events)) {
    const count = des ? ` (${des}DES)` : ''
    return `PTCA WITH STENTING OF ${vessels}${count} WAS DONE SUCCESSFULLY`
  }
  const allPoba = listed.length > 0 && listed.every((vessel) => vesselPciKind(procedure, vessel) === 'POBA')
  if (allPoba) return `POBA OF ${vessels} WAS DONE SUCCESSFULLY`
  return `PTCA OF ${vessels} WAS DONE SUCCESSFULLY`
}

function segmentTitle(seg: Segment | string): string {
  if (seg === 'proximal-mid') return 'Proximal to mid'
  if (seg === 'mid-distal') return 'Mid to distal'
  if (seg === 'ostioproximal') return 'Ostial to proximal'
  if (seg === 'ostial') return 'Ostial'
  return capitalise(seg)
}

function deployedToPhrase(s: Pick<StentUse, 'deployedToMm'>): string {
  if (s.deployedToMm === undefined || s.deployedToMm === null || !Number.isFinite(s.deployedToMm) || s.deployedToMm <= 0) {
    return ''
  }
  return ` to a size of ${fmtMm(s.deployedToMm)} mm`
}

function stentLocation(s: StentUse): string {
  const segs = asSegments(s.segment).filter((x) => x !== 'other')
  const loc = segs.map(segmentTitle).join(' to ')
  return loc ? `${loc} ${s.vessel}` : s.vessel
}

function coronaryName(side: 'left' | 'right'): string {
  return side === 'right' ? 'RCA' : 'LCA'
}

function inflationAtms(b: Pick<BalloonUse, 'inflations'>): number[] {
  return b.inflations.map((i) => i.atm).filter((n): n is number => n !== undefined && n !== null)
}

function atmPhrase(atms: number[]): string {
  return atms.length ? ` at ${atms.join(',')}atm` : ''
}

function compactSize(diameterMm: number, lengthMm: number): string {
  return `${fmtMm(diameterMm)}x${lengthMm}mm`
}

function balloonAtPhrase(b: BalloonUse, article: boolean): string {
  const size = compactSize(b.diameterMm, b.lengthMm)
  const name = b.name.trim()
  const head = [article ? 'a' : '', size, name, 'balloon'].filter(Boolean).join(' ')
  return `${head}${atmPhrase(inflationAtms(b))}`
}

function listedBalloons(balloons: BalloonUse[]): string {
  return balloons
    .map((b, i) => balloonAtPhrase(b, i === 0))
    .join(' and ')
}

function predilClause(predils: BalloonUse[]): string {
  if (!predils.length) return ''
  const seq = predils.length > 1 ? ' sequentially' : ''
  return `the lesion was predilated${seq} with ${listedBalloons(predils)}`
}

function guideSide(guide: GuideCatheter, vessel: Vessel): 'left' | 'right' {
  const fromDevice = coronaryFromDevice(guide.device || '')
  if (guide.device) return fromDevice
  return coronaryOf(vessel)
}

function cannulationSentence(guide: GuideCatheter): string {
  const side = coronaryFromDevice(guide.device || '')
  return `Later ${coronaryName(side)} was cannulated with a ${guideInventory(guide)} guiding Catheter.`
}

function vesselParagraph(hw: VesselHardware): string {
  const sentences: string[] = []
  const extras: string[] = []
  if (hw.aspirations.length) {
    extras.push(
      `Thrombus aspiration was performed using ${hw.aspirations.map(namedInventory).join(', ')}.`,
    )
  }
  if (hw.microcatheters.length) {
    extras.push(`A ${hw.microcatheters.map(namedInventory).join(', ')} microcatheter was used.`)
  }
  if (hw.extensions.length) {
    extras.push(`A ${hw.extensions.map(namedInventory).join(', ')} guide extension was used.`)
  }

  const wire = hw.wires[0]
  const predil = predilClause(hw.predils)
  if (wire && predil && extras.length === 0) {
    sentences.push(
      `And the ${hw.vessel} lesion was crossed with a ${wireInventory(wire)} guide wire and ${predil}.`,
    )
  } else {
    if (wire) {
      sentences.push(
        `And the ${hw.vessel} lesion was crossed with a ${wireInventory(wire)} guide wire.`,
      )
    }
    sentences.push(...extras)
    if (predil) {
      const lead = wire || extras.length ? 'The lesion was' : `And the ${hw.vessel} lesion was`
      sentences.push(`${lead} ${predil.replace(/^the lesion was /, '')}.`)
    }
  }

  for (const s of hw.stents) {
    const atm = s.deployedAtAtm !== undefined && s.deployedAtAtm !== null ? ` at ${s.deployedAtAtm}atm` : ''
    sentences.push(
      `Later a ${compactSize(s.diameterMm, s.lengthMm)} ${s.name} stent was deployed to the ${stentLocation(s)}${atm}${deployedToPhrase(s)}.`,
    )
  }
  if (hw.postdils.length && hw.stents.length) {
    sentences.push(
      `The proximal, mid, distal part of the stent was post dilated with ${listedBalloons(hw.postdils)}.`,
    )
  }
  if (hw.pots.length) {
    sentences.push(`LMCA POT was performed with ${listedBalloons(hw.pots)}.`)
  }
  for (const i of hw.imaging) {
    const verb = i.finding ? ` demonstrated ${i.finding}` : ' was performed'
    sentences.push(`${i.modality} of the ${i.vessel}${verb}.`)
  }
  return sentences.join(' ')
}

function residualPhrase(outcome: Outcome): string {
  return outcome.residualStenosis === 0 ? 'no residual stenosis' : `${outcome.residualStenosis}% residual stenosis`
}

function thrombusPhrase(outcome: Outcome): string {
  return outcome.complications.some((c) => c.toLowerCase() === 'thrombus') ? 'thrombus' : 'no thrombus'
}

function dissectionPhrase(outcome: Outcome): string {
  return outcome.dissection === 'none' ? 'no dissection' : `NHLBI type ${outcome.dissection} dissection`
}

function distalFlowPhrase(outcome: Outcome): string {
  if (outcome.noReflow) return 'no-reflow'
  if (outcome.slowFlow) return 'slow flow distally'
  if (outcome.finalTimiFlow === 3) return 'good vessel flow distally'
  return `TIMI ${timiRoman(outcome.finalTimiFlow)} flow distally`
}

export function checkShootsSentence(procedure: Procedure, hasStent: boolean): string {
  const o = procedure.outcome
  const lead = hasStent ? 'Check shoots revealed well deployed stent with' : 'Check shoots revealed'
  const core = `${lead} ${residualPhrase(o)}, ${thrombusPhrase(o)}, ${dissectionPhrase(o)} with ${distalFlowPhrase(o)}.`
  return o.sideBranchCompromise ? `${core} Side-branch compromise was noted.` : core
}

export function ptcaProcedureParagraphs(procedure: Procedure): string[] {
  const access = accessShortCode(procedure.access)
  const hardware = pciVessels(procedure).map((v) => hardwareForVessel(procedure, v))
  const paragraphs: string[] = []
  let current: string[] = [
    `Patient was taken up for PTCA with informed consent, ${access} access was taken.`,
  ]
  let lastSide: 'left' | 'right' | null = null
  let startedVessel = false

  for (const hw of hardware) {
    const sentences: string[] = []
    const guide = hw.guides[0]
    if (guide) {
      const side = guideSide(guide, hw.vessel)
      if (side !== lastSide) {
        sentences.push(cannulationSentence(guide))
        lastSide = side
      }
    }
    const body = vesselParagraph(hw)
    if (body) sentences.push(body)
    if (!sentences.length) continue
    if (startedVessel) {
      paragraphs.push(current.filter(Boolean).join(' '))
      current = sentences
    } else {
      current.push(...sentences)
      startedVessel = true
    }
  }

  if (hardware.some((hw) => hw.stents.length || hw.predils.length || hw.postdils.length || hw.pots.length)) {
    current.push(checkShootsSentence(procedure, hardware.some((hw) => hw.stents.length)))
  }
  const comps = procedure.outcome.complications.filter((c) => c && c !== 'none')
  current.push(
    comps.length ? `Complications: ${comps.join(', ')}.` : 'There was no procedure related complications.',
  )
  paragraphs.push(current.filter(Boolean).join(' '))
  return paragraphs.filter(Boolean)
}

export function ptcaProcedureNarrative(procedure: Procedure): string {
  return ptcaProcedureParagraphs(procedure).join('\n\n')
}
