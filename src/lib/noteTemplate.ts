import {
  article,
  capitalise,
  DISCLAIMER,
  fmtDisplayDate,
  fmtMm,
  fmtSize,
  findingLocationShort,
  locationShort,
  MAIN_VESSELS,
  REPORT_VESSEL_ORDER,
  LAD_REPORT_BRANCHES,
  LCX_REPORT_BRANCHES,
  formatSegments,
  findingNoteValue,
  formatDescribedFinding,
  findingTypeOf,
  hasTimiFlow,
  isUnremarkableFinding,
  lmcaLengthLabel,
  ladLeadClause,
  lcxDominanceLabel,
  ramusSizeLabel,
  rcaLeadClause,
  isSizeVessel,
  cagImpressionSentence,
  cagAdviceSentence,
  cagArterialGraftLine,
  vesselReportName,
  isLadOtherSegment,
  ladOtherSentence,
  VESSELS,
  timiRoman,
  sortFindingsByAnatomy,
  applyVesselMeta,
  freeTextSentence,
  issueJoinPhrase,
} from '@/lib/format'
import { accessNarrative, accessSpecialNoteLine, formatLabAccess } from '@/lib/access'
import type {
  AngioFinding,
  BalloonUse,
  Closure,
  Indication,
  Outcome,
  Periprocedural,
  Procedure,
  ProcedureEvent,
  StentUse,
  Vessel,
} from '@/types/procedure'

export { DISCLAIMER }

function patientLine(p: Procedure): string {
  const title = p.patient.title ? `${p.patient.title}. ` : ''
  const name = p.patient.name.trim() || '____'
  const age = p.patient.age === '' ? '—' : String(p.patient.age)
  const sex = p.patient.sex || '—'
  return `Patient: ${title}${name}, ${age}/${sex}`
}

function stemiPhrase(territory?: string): string {
  if (!territory) return 'STEMI'
  if (
    territory === 'anterior' ||
    territory === 'inferior' ||
    territory === 'lateral' ||
    territory === 'posterior' ||
    territory === 'extensive anterior'
  ) {
    return `Acute ${territory} wall STEMI`
  }
  return `Acute ${territory} STEMI`
}

function indicationNarrative(ind: Indication, opts?: { includePciType?: boolean }): string {
  const chips = ind.chips
  const bits: string[] = []
  if (chips.includes('STEMI')) {
    bits.push(stemiPhrase(ind.stemiTerritory))
  }
  if (chips.includes('NSTEMI')) bits.push('NSTEMI')
  if (chips.includes('UA')) bits.push('unstable angina')
  if (chips.includes('CSA')) bits.push('chronic stable angina')
  if (chips.includes('Pre-op Evaluation')) {
    const valves = ind.valveSurgeries ?? []
    bits.push(
      valves.length
        ? `pre-operative evaluation (${valves.join(', ')})`
        : 'pre-operative evaluation',
    )
  }
  if (chips.includes('Post-CABG')) {
    const grafts = ind.grafts ?? []
    bits.push(
      grafts.length ? `post-CABG (${grafts.join(', ')})` : 'post-CABG',
    )
  }
  if (chips.includes('Post-PCI')) {
    const territories = ind.stentTerritories ?? []
    bits.push(
      territories.length ? `post-PCI (${territories.join(', ')})` : 'post-PCI',
    )
  }
  if (chips.includes('TMT+')) bits.push('positive TMT')
  if (chips.includes('Stress Echo')) bits.push('stress echocardiography')
  if (chips.includes('Arrhythmia')) bits.push('arrhythmia')

  let text = bits.join('; ') || chips.join(', ')
  if (opts?.includePciType !== false && ind.pciType) {
    const pci =
      ind.pciType === 'Adhoc' ? 'ad-hoc PCI' : `${ind.pciType.toLowerCase()} PCI`
    text = text ? `${text} — ${pci}` : pci
  }
  return text || '____'
}

function diseaseShowsSentence(f: AngioFinding, lead: string): string {
  const note = findingNoteValue(f)
  const noteBit = note ? `, ${note.charAt(0).toLowerCase()}${note.slice(1)}` : ''
  const timi = hasTimiFlow(f) ? ` TIMI ${timiRoman(f.timiFlow)} flow.` : ''
  return `${lead} ${formatDescribedFinding(f)}${noteBit}.${timi}`
}

function findingShowsLead(f: AngioFinding): string {
  return `${capitalise(findingLocationShort(f))} shows`
}

function findingDiseaseClause(f: AngioFinding): string {
  if (isLadOtherSegment(f)) return freeTextSentence(f.segmentOther)
  return diseaseShowsSentence(f, findingShowsLead(f))
}

function labeledDiseaseSentence(f: AngioFinding, intro = ''): string {
  const disease = findingDiseaseClause(f)
  const name = vesselReportName(f)
  if (intro) return `${name}: ${intro}. ${disease}`
  const keepLabel = MAIN_VESSELS.includes(f.vessel) || f.vessel === 'Ramus'
  if (keepLabel && formatSegments(f.segment)) return `${name}: ${disease}`
  return disease
}

export function findingSentence(f: AngioFinding): string {
  if (f.vessel === 'LMCA') {
    if (f.separateOrigin) return 'LMCA: separate origin of LAD and LCX.'
    const lengthLabel = lmcaLengthLabel(f)
    const isNormal = findingTypeOf(f) === 'normal' || isUnremarkableFinding(f)
    if (isNormal) {
      return lengthLabel ? `LMCA: ${lengthLabel} and Normal.` : 'LMCA: Normal.'
    }
    const lines: string[] = []
    if (lengthLabel) lines.push(`LMCA: ${lengthLabel}.`)
    lines.push(findingDiseaseClause(f))
    return lines.join('\n')
  }

  const prefix = `${vesselReportName(f)}: `
  const place = formatSegments(f.segment)
  const placeBit = place ? capitalise(place) : ''
  const isNormal = findingTypeOf(f) === 'normal' || isUnremarkableFinding(f)

  if (f.vessel === 'LAD') {
    if (isLadOtherSegment(f)) return ladOtherSentence(f)
    const lead = ladLeadClause(f)
    if (isNormal) {
      return lead ? `LAD: ${lead} and Normal.` : `${prefix}${placeBit ? `${placeBit}: ` : ''}Normal.`
    }
    return labeledDiseaseSentence(f, lead)
  }

  if (f.vessel === 'LCX') {
    const dominance = lcxDominanceLabel(f)
    const name = vesselReportName(f)
    if (isNormal) {
      return dominance ? `${name}: ${dominance} and Normal.` : `${prefix}${placeBit ? `${placeBit}: ` : ''}Normal.`
    }
    return labeledDiseaseSentence(f, dominance)
  }

  if (isSizeVessel(f.vessel)) {
    const size = ramusSizeLabel(f)
    const name = vesselReportName(f)
    if (isNormal) {
      return size ? `${name}: ${size} and Normal.` : `${prefix}${placeBit ? `${placeBit}: ` : ''}Normal.`
    }
    return labeledDiseaseSentence(f, size)
  }

  if (f.vessel === 'RCA') {
    const lead = rcaLeadClause(f)
    if (isNormal) {
      return lead ? `RCA: ${lead} and Normal.` : `${prefix}${placeBit ? `${placeBit}: ` : ''}Normal.`
    }
    return labeledDiseaseSentence(f, lead)
  }

  if (isNormal) {
    const after = placeBit ? `${placeBit}: ` : ''
    return `${prefix}${after}Normal.`
  }

  return labeledDiseaseSentence(f)
}

function startLower(s: string): string {
  if (!s) return s
  if (/^[A-Z]{2,}(?:\b|[0-9])/.test(s) || /^[A-Z][0-9]/.test(s)) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function joinDiseaseClauses(disease: AngioFinding[]): string {
  const items = disease
    .map((f) => ({ f, clause: findingDiseaseClause(f) }))
    .filter((item) => item.clause)
  if (!items.length) return ''
  let text = items[0].clause
  for (let i = 1; i < items.length; i++) {
    const connector = issueJoinPhrase(items[i].f, i - 1)
    const head = text.replace(/[.\s]+$/, '')
    const tail = items[i].clause
    if (!connector) {
      text = `${head}. ${tail}`
      continue
    }
    const glued = /^[,;:]/.test(connector)
      ? `${head}${connector} ${startLower(tail)}`
      : `${head} ${connector} ${startLower(tail)}`
    text = glued.replace(/\s+/g, ' ')
  }
  return /[.!?]$/.test(text.trim()) ? text : `${text}.`
}

function combineVesselFindings(meta: AngioFinding, disease: AngioFinding[]): string {
  const joined = joinDiseaseClauses(disease)

  if (meta.vessel === 'LMCA') {
    if (meta.separateOrigin) return 'LMCA: separate origin of LAD and LCX.'
    const lengthLabel = lmcaLengthLabel(meta)
    if (lengthLabel) return `LMCA: ${lengthLabel}.\n${joined}`
    return joined
  }

  const name = vesselReportName(meta)
  if (meta.vessel === 'LAD') {
    const lead = ladLeadClause(meta)
    return lead ? `${name}: ${lead}. ${joined}` : `${name}: ${joined}`
  }
  if (meta.vessel === 'LCX') {
    const dominance = lcxDominanceLabel(meta)
    return dominance ? `${name}: ${dominance}. ${joined}` : `${name}: ${joined}`
  }
  if (isSizeVessel(meta.vessel)) {
    const size = ramusSizeLabel(meta)
    return size ? `${name}: ${size}. ${joined}` : `${name}: ${joined}`
  }
  if (meta.vessel === 'RCA') {
    const lead = rcaLeadClause(meta)
    return lead ? `${name}: ${lead}. ${joined}` : `${name}: ${joined}`
  }
  return `${name}: ${joined}`
}

function pickMetaSource(group: AngioFinding[]): AngioFinding {
  return (
    group.find(
      (f) =>
        Boolean(f.ladType) ||
        Boolean(f.ladRemarkOpen) ||
        Boolean(f.lcxDominance) ||
        Boolean(f.rcaDominance) ||
        Boolean(f.rcaRemarkOpen) ||
        Boolean(f.ramusSize) ||
        Boolean(f.lengthCategory) ||
        Boolean(f.lengthMm) ||
        Boolean(f.separateOrigin) ||
        Boolean(f.omMajor) ||
        Boolean(f.lcxParent),
    ) ?? group[0]
  )
}

export function vesselSentence(group: AngioFinding[]): string {
  if (!group.length) return ''
  const sorted = sortFindingsByAnatomy(group)
  if (sorted.length === 1) return findingSentence(sorted[0])

  const metaSource = pickMetaSource(sorted)
  const disease = sorted.filter((f) => isLadOtherSegment(f) || !isUnremarkableFinding(f))
  if (disease.length === 0) {
    return findingSentence({
      ...applyVesselMeta(sorted[0], metaSource),
      findingType: 'normal',
      stenosis: 0,
      features: [],
      segment: undefined,
      segmentOther: undefined,
    })
  }
  if (disease.length === 1) return findingSentence(applyVesselMeta(disease[0], metaSource))
  return combineVesselFindings(metaSource, disease)
}

function dominanceSentence(dominance?: string): string | null {
  const d = dominance?.trim()
  if (!d) return null
  if (/^codominant$/i.test(d) || /^co-dominant$/i.test(d) || /^balanced$/i.test(d)) {
    return 'Codominant coronary circulation.'
  }
  if (/^super-dominant right$/i.test(d)) return 'Super-dominant right coronary circulation.'
  if (/^super-dominant left$/i.test(d)) return 'Super-dominant left coronary circulation.'
  return `${d} dominant coronary circulation.`
}

function defaultAngioFinding(vessel: Vessel): AngioFinding {
  return {
    id: vessel,
    vessel,
    stenosis: 0,
    timiFlow: 'none',
    features: [],
    isTarget: false,
  }
}

function groupFindingsByVessel(findings: AngioFinding[]): Map<Vessel, AngioFinding[]> {
  const byVessel = new Map<Vessel, AngioFinding[]>()
  for (const f of findings) {
    const list = byVessel.get(f.vessel)
    if (list) list.push(f)
    else byVessel.set(f.vessel, [f])
  }
  return byVessel
}

function findingsInOrder(
  byVessel: Map<Vessel, AngioFinding[]>,
  order: Vessel[],
): AngioFinding[] {
  const found: AngioFinding[] = []
  for (const v of order) {
    const list = byVessel.get(v)
    if (list?.length) found.push(...sortFindingsByAnatomy(list))
  }
  return found
}

function withAppendedFindings(line: string, extras: AngioFinding[]): string {
  if (!extras.length) return line
  const groups: AngioFinding[][] = []
  const seen = new Set<Vessel>()
  for (const f of extras) {
    if (seen.has(f.vessel)) continue
    seen.add(f.vessel)
    groups.push(extras.filter((x) => x.vessel === f.vessel))
  }
  return `${line} ${groups.map(vesselSentence).join(' ')}`
}

function angioNarrative(
  findings: AngioFinding[],
  dominance?: string,
  opts?: { includeTargets?: boolean },
): string {
  const lead = dominanceSentence(dominance)
  if (findings.length === 0) {
    return [lead, 'Coronary angiogram findings not recorded.'].filter(Boolean).join('\n')
  }
  const byVessel = groupFindingsByVessel(findings)

  const folded = new Set<Vessel>([...LAD_REPORT_BRANCHES, ...LCX_REPORT_BRANCHES])
  const lines: string[] = []

  for (const v of REPORT_VESSEL_ORDER) {
    const found = byVessel.get(v)
    const group = found ?? (MAIN_VESSELS.includes(v) ? [defaultAngioFinding(v)] : undefined)
    if (!group) continue
    let sentence = vesselSentence(group)
    if (v === 'LAD') {
      sentence = withAppendedFindings(sentence, findingsInOrder(byVessel, LAD_REPORT_BRANCHES))
    }
    if (v === 'LCX') {
      sentence = withAppendedFindings(sentence, findingsInOrder(byVessel, LCX_REPORT_BRANCHES))
    }
    lines.push(sentence)
  }

  for (const v of VESSELS) {
    if (REPORT_VESSEL_ORDER.includes(v) || folded.has(v)) continue
    const found = byVessel.get(v)
    if (found) lines.push(vesselSentence(found))
  }

  if (opts?.includeTargets !== false) {
    const targets = findings.filter((f) => f.isTarget)
    if (targets.length === 1) {
      lines.push(`Target vessel: ${findingLocationShort(targets[0])}.`)
    } else if (targets.length > 1) {
      const list = targets.map((t) => findingLocationShort(t))
      const last = list.pop()
      lines.push(`Target vessels: ${list.join(', ')} and ${last}.`)
    }
  }
  const body = lines.join('\n')
  return lead ? `${lead}\n${body}` : body
}

const RCA_REPORT_BRANCHES: Vessel[] = ['PDA', 'PLV']

export function mainVesselParagraph(findings: AngioFinding[], vessel: Vessel): string {
  const byVessel = groupFindingsByVessel(findings)

  const found = byVessel.get(vessel)
  const group = found ?? (MAIN_VESSELS.includes(vessel) ? [defaultAngioFinding(vessel)] : undefined)
  if (!group) return 'Not assessed.'

  let sentence = vesselSentence(group)
  if (vessel === 'LAD') {
    sentence = withAppendedFindings(sentence, findingsInOrder(byVessel, LAD_REPORT_BRANCHES))
  }
  if (vessel === 'LCX') {
    sentence = withAppendedFindings(sentence, findingsInOrder(byVessel, LCX_REPORT_BRANCHES))
  }
  if (vessel === 'RCA') {
    sentence = withAppendedFindings(sentence, findingsInOrder(byVessel, RCA_REPORT_BRANCHES))
  }
  const name = vesselReportName(group[0] ?? { vessel })
  const labels = [...new Set([name, vessel])].map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  return sentence.replace(new RegExp(`^(?:${labels.join('|')})\\s*:\\s*`), '')
}

function balloonPhrase(b: BalloonUse): string {
  return `${article(b.name)} ${b.name} ${b.type} balloon ${fmtSize(b.diameterMm, b.lengthMm)}`
}

function inflationTrail(inflations: BalloonUse['inflations']): string {
  if (inflations.length === 0) return ''
  const first = inflations[0]
  let s = ` at ${first.atm} atm for ${first.seconds} seconds`
  const ordinals = ['second', 'third', 'fourth', 'fifth', 'sixth']
  for (let i = 1; i < inflations.length; i++) {
    const ord = ordinals[i - 1] ?? `${i + 1}th`
    s += `, followed by a ${ord} inflation at ${inflations[i].atm} atm for ${inflations[i].seconds} seconds`
  }
  return s
}

function balloonSentence(
  kind: 'predilatation' | 'postdilatation',
  b: BalloonUse,
): string {
  const loc = locationShort(b.vessel, b.segment)
  const verb =
    kind === 'predilatation'
      ? 'Predilatation was performed'
      : 'Post-dilatation was performed'
  const withLoc =
    kind === 'predilatation'
      ? ` at the ${loc} with ${balloonPhrase(b)}`
      : ` with ${balloonPhrase(b)}`
  let s = `${verb}${withLoc}${inflationTrail(b.inflations)}.`
  if (b.result) s += ` ${capitalise(b.result)}.`
  return s
}

function stentTypePhrase(t: StentUse['type']): string {
  switch (t) {
    case 'DES':
      return 'drug-eluting stent'
    case 'BMS':
      return 'bare-metal stent'
    case 'BVS':
      return 'bioresorbable scaffold'
    case 'Covered':
      return 'covered stent'
    default:
      return 'stent'
  }
}

function stentSentence(e: Extract<ProcedureEvent, { kind: 'stent' }>, all: ProcedureEvent[]): string {
  const s = e.data
  const loc = locationShort(s.vessel, s.segment)
  let text = `${capitalise(article(s.name))} ${s.name} ${stentTypePhrase(s.type)} ${fmtSize(s.diameterMm, s.lengthMm)} was deployed at the ${loc} at ${s.deployedAtAtm} atm for ${s.seconds} seconds`
  if (s.overlapWithEventId) {
    const other = all.find((x) => x.id === s.overlapWithEventId)
    if (other?.kind === 'stent') {
      const o = other.data
      text += `, overlapping the previously deployed ${fmtMm(o.diameterMm)} × ${o.lengthMm} mm stent`
    } else {
      text += ', overlapping a previously deployed stent'
    }
  }
  if (s.technique && s.technique !== 'After predilatation') {
    text += ` using a ${s.technique.toLowerCase()} technique`
  }
  if (s.technique === 'Direct stenting') {
    text += ' (direct stenting)'
  }
  return `${text}.`
}

function eventSentence(e: ProcedureEvent, all: ProcedureEvent[]): string {
  switch (e.kind) {
    case 'guideCatheter': {
      const g = e.data
      const system =
        g.coronary === 'right'
          ? 'The right coronary artery was engaged'
          : 'The left coronary system was engaged'
      return `${system} with a ${g.size} ${g.curve} guiding catheter.`
    }
    case 'guidewire': {
      const w = e.data
      const parked = formatSegments(w.parkedSegment) || 'distal'
      return `The lesion was crossed with a 0.014" ${w.name} ${w.type} guidewire and parked in the ${parked} ${w.vessel}.`
    }
    case 'predilatation':
      return balloonSentence('predilatation', e.data)
    case 'postdilatation':
      return balloonSentence('postdilatation', e.data)
    case 'stent':
      return stentSentence(e, all)
    case 'imaging': {
      const i = e.data
      const verb = i.finding ? ` demonstrated ${i.finding}` : ' was performed'
      return `${i.modality} of the ${i.vessel}${verb}.`
    }
    case 'adjunct': {
      const a = e.data
      const extra = a.detail.trim() ? ` ${a.detail.trim().replace(/\.$/, '')}.` : '.'
      if (a.type === 'Other') return extra.trim() || 'An adjunctive device was used.'
      return `${a.type} was performed${a.detail.trim() ? ` (${a.detail.trim()})` : ''}.`
    }
    case 'note':
      return e.data.text.trim()
    default:
      return ''
  }
}

export function procedureSection(events: ProcedureEvent[]): string {
  if (events.length === 0) return 'No procedural steps recorded.'
  return events.map((e) => eventSentence(e, events)).filter(Boolean).join('\n')
}

function resultNarrative(o: Outcome): string {
  const quality =
    o.residualStenosis === 0 && o.finalTimiFlow === 3
      ? 'Good angiographic result'
      : 'Angiographic result'
  const lines: string[] = [
    `${quality} with ${o.residualStenosis}% residual stenosis and TIMI ${timiRoman(o.finalTimiFlow)} flow distally.`,
  ]
  const neg: string[] = []
  if (o.dissection === 'none') neg.push('no dissection')
  else lines.push(`NHLBI type ${o.dissection} dissection noted.`)
  if (!o.sideBranchCompromise) neg.push('no side-branch compromise')
  else lines.push('Side-branch compromise noted.')
  if (!o.noReflow) neg.push('no no-reflow')
  else lines.push('No-reflow occurred.')
  if (o.slowFlow) lines.push('Slow flow observed.')
  if (neg.length) lines.push(`${capitalise(neg.join(', '))}.`)
  const comps = o.complications.filter((c) => c && c !== 'none')
  if (comps.length) lines.push(`Complications: ${comps.join(', ')}.`)
  if (o.comment.trim()) lines.push(o.comment.trim())
  return lines.join('\n')
}

function periNarrative(p: Periprocedural): string {
  const bits: string[] = []
  if (p.heparinIU !== '') bits.push(`Heparin ${p.heparinIU} IU.`)
  if (p.gp2b3a && p.gp2b3a !== 'none') bits.push(`GP IIb/IIIa: ${p.gp2b3a}.`)
  if (p.contrastAgent || p.contrastVolumeMl !== '') {
    const vol = p.contrastVolumeMl === '' ? '' : ` ${p.contrastVolumeMl} mL`
    bits.push(`Contrast: ${p.contrastAgent || 'unspecified'}${vol}.`)
  }
  if (p.fluoroTimeMin !== '') bits.push(`Fluoroscopy time ${p.fluoroTimeMin} min.`)
  if (p.dap.trim()) bits.push(`DAP ${p.dap}.`)
  return bits.join(' ') || 'Periprocedural details not recorded.'
}

function closureNarrative(c: Closure): string {
  let haem = ''
  switch (c.method) {
    case 'TR band':
      haem = 'Sheath removed and haemostasis achieved with a TR band.'
      break
    case 'manual compression':
      haem = 'Sheath removed and haemostasis achieved with manual compression.'
      break
    case 'closure device':
      haem = c.device
        ? `Sheath removed and arteriotomy closed with ${c.device}.`
        : 'Sheath removed and a vascular closure device applied.'
      break
    case 'sheath in situ':
      haem = 'Sheath left in situ.'
      break
    default:
      haem = 'Closure not recorded.'
      break
  }
  const dest = c.destination || 'ward'
  const cond = c.condition || 'stable'
  return `${haem} Patient shifted to ${dest} in a ${cond} condition.`
}

function heading(p: Procedure): string {
  if (p.kind === 'cag') return 'CAG — PROCEDURE NOTE'
  const hasStent = p.events.some((e) => e.kind === 'stent')
  return hasStent ? 'PTCA & STENTING — PROCEDURE NOTE' : 'PTCA — PROCEDURE NOTE'
}

function operatorsLine(p: Procedure): string | null {
  const main = p.mainOperator?.trim() ?? ''
  const assistant = p.assistantOperator?.trim() ?? ''
  const extras = (p.operators ?? []).filter((o) => o && o !== main && o !== assistant)
  const parts: string[] = []
  if (main) parts.push(`${main} (main)`)
  if (assistant) parts.push(`${assistant} (assistant)`)
  parts.push(...extras)
  if (!parts.length) return null
  return `Operators: ${parts.join(', ')}`
}

function labDetailLines(procedure: Procedure): string[] {
  const lab = procedure.lab
  if (!lab) return []
  const pressure = (lab.aorticPressureMmHg ?? '').trim()
  const pressureLine = !pressure
    ? ''
    : /mm\s*hg$/i.test(pressure)
      ? pressure
      : `${pressure} mmHg`
  const access = formatLabAccess(procedure.access)
  const rows: Array<[string, string]> = [
    ['Doctor Name', lab.doctorName],
    ['Technologist', lab.technologist],
    ['Scrub Nurse', lab.scrubNurse],
    ['Access', access],
    ['Catheter', lab.catheter],
    ['Contrast', lab.contrast],
    ['Haemodynamic Data', lab.haemodynamicData],
    ['Aortic Pressure', pressureLine],
  ]
  return rows
    .map(([label, value]) => {
      const v = (value ?? '').trim()
      return v ? `${label}: ${v}` : null
    })
    .filter((line): line is string => Boolean(line))
}

export function generateNote(procedure: Procedure): string {
  const isCag = procedure.kind === 'cag'
  const timeRange =
    procedure.patient.startTime && procedure.closure.endTime
      ? `${procedure.patient.startTime} – ${procedure.closure.endTime}`
      : procedure.patient.startTime || '____'

  const blocks: string[] = [
    heading(procedure),
    '',
    patientLine(procedure),
    `Cath No: ${procedure.patient.hospitalId.trim() || '____'}`,
    `Date: ${fmtDisplayDate(procedure.patient.date)}`,
  ]
  if (!isCag) blocks.push(`Time: ${timeRange}`)
  blocks.push(`Indication: ${indicationNarrative(procedure.indication, { includePciType: !isCag })}`)

  const symptoms = procedure.indication.symptoms ?? []
  if (symptoms.length) {
    blocks.push(`Symptoms: ${symptoms.join(', ')}`)
  }

  const opLine = operatorsLine(procedure)
  if (opLine) blocks.push(opLine)
  blocks.push(...labDetailLines(procedure))

  blocks.push('', 'ACCESS', accessNarrative(procedure.access))
  const specialNote = accessSpecialNoteLine(procedure.access)
  if (specialNote) blocks.push(specialNote)
  blocks.push(
    '',
    'CORONARY ANGIOGRAM',
    angioNarrative(procedure.baselineAngio, procedure.dominance, { includeTargets: !isCag }),
  )
  if (!isCag) {
    blocks.push('', 'PROCEDURE', procedureSection(procedure.events))
    blocks.push(
      '',
      'RESULT',
      resultNarrative(procedure.outcome),
      '',
      'PERIPROCEDURAL',
      periNarrative(procedure.periprocedural),
      '',
      'CLOSURE',
      closureNarrative(procedure.closure),
    )
  } else {
    const graftLines = [
      cagArterialGraftLine('LIMA', procedure.cagLimaOn, procedure.cagLimaNote),
      cagArterialGraftLine('RIMA', procedure.cagRimaOn, procedure.cagRimaNote),
    ].filter((line): line is string => Boolean(line))
    if (graftLines.length) blocks.push('', ...graftLines)
    blocks.push(
      '',
      'IMPRESSION',
      cagImpressionSentence(procedure.cagImpressions, procedure.cagCustomImpressions),
      '',
      'ADVICE',
      cagAdviceSentence(procedure.cagAdvices, procedure.cagCustomAdvices),
    )
  }

  if (procedure.notes.trim()) {
    blocks.push('', isCag ? 'FINAL' : 'NOTES', procedure.notes.trim())
  }

  blocks.push('', DISCLAIMER)
  return blocks.join('\n')
}

export function hasStentEvents(events: ProcedureEvent[]): boolean {
  return events.some((e) => e.kind === 'stent')
}

export function suggestedPostDil(stent: StentUse): BalloonUse {
  const diameterMm = Math.min(5, Math.round((stent.diameterMm + 0.25) * 4) / 4)
  return {
    name: 'NC Sapphire',
    type: 'non-compliant',
    diameterMm,
    lengthMm: 12,
    vessel: stent.vessel,
    segment: stent.segment,
    inflations: [{ atm: 18, seconds: 15 }],
  }
}
