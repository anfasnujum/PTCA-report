import {
  article,
  capitalise,
  DISCLAIMER,
  fmtDisplayDate,
  fmtMm,
  fmtSize,
  locationShort,
  MAIN_VESSELS,
  timiRoman,
} from '@/lib/format'
import type {
  Access,
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

function indicationNarrative(ind: Indication): string {
  const chips = ind.chips
  if (chips.length === 0) return '____'

  const bits: string[] = []
  if (chips.includes('STEMI')) {
    const wall = ind.stemiTerritory
      ? `Acute ${ind.stemiTerritory} wall STEMI`
      : 'STEMI'
    bits.push(wall)
  }
  if (chips.includes('NSTEMI')) bits.push('NSTEMI')
  if (chips.includes('UA')) bits.push('unstable angina')
  if (chips.includes('CSA')) bits.push('chronic stable angina')

  const pci = [
    chips.includes('Primary PCI') ? 'primary PCI' : '',
    chips.includes('Rescue PCI') ? 'rescue PCI' : '',
    chips.includes('Post-thrombolysis') ? 'post-thrombolysis PCI' : '',
    chips.includes('Staged PCI') ? 'staged PCI' : '',
    chips.includes('Ad-hoc PCI') ? 'ad-hoc PCI' : '',
  ].filter(Boolean)

  let text = bits.join('; ') || chips.filter((c) => !pci.includes(c.toLowerCase())).join(', ')
  if (!text) text = chips.join(', ')
  if (pci.length) {
    text = text ? `${text} — ${pci.join(', ')}` : pci.join(', ')
  }
  return text
}

function accessNarrative(a: Access): string {
  if (!a.site || !a.side || !a.sheathSize) {
    const parts = [a.side, a.site, a.sheathSize].filter(Boolean)
    return parts.length ? `${parts.join(' ')} access.` : 'Access not recorded.'
  }
  const artery =
    a.site === 'distal radial'
      ? 'distal radial artery'
      : `${a.site} artery`
  const attempt = a.singleAttempt
    ? ' in a single attempt'
    : a.punctures > 1
      ? ` after ${a.punctures} punctures`
      : ''
  return `${capitalise(a.side)} ${artery} accessed${attempt}; ${a.sheathSize} sheath inserted.`
}

function featureAdjectives(features: string[]): { adj: string; rest: string[] } {
  const adjOrder = ['thrombotic', 'calcified', 'ectatic', 'tortuous']
  const adj = adjOrder.filter((f) => features.includes(f))
  const rest = features.filter((f) => !adjOrder.includes(f))
  return { adj: adj.length ? `${adj.join(', ')} ` : '', rest }
}

function findingSentence(f: AngioFinding): string {
  if (f.stenosis === 0 && f.features.length === 0) return `${f.vessel}: normal.`
  if (f.features.includes('CTO') || f.stenosis === 100) {
    const loc = f.segment ? ` in the ${f.segment} segment` : ''
    return `${f.vessel}: chronic total occlusion${loc}, TIMI ${timiRoman(f.timiFlow)} flow.`
  }
  const { adj, rest } = featureAdjectives(f.features)
  const loc = f.segment ? ` in the ${f.segment} segment` : ''
  let s = `${f.vessel}: ${f.stenosis}% ${adj}stenosis${loc}, TIMI ${timiRoman(f.timiFlow)} flow.`
  if (rest.length) s = s.replace(/\.$/, `; ${rest.join(', ')}.`)
  return s
}

function angioNarrative(findings: AngioFinding[]): string {
  if (findings.length === 0) return 'Coronary angiogram findings not recorded.'
  const byVessel = new Map<Vessel, AngioFinding>()
  for (const f of findings) byVessel.set(f.vessel, f)

  const ordered: AngioFinding[] = []
  for (const v of MAIN_VESSELS) {
    const found = byVessel.get(v)
    if (found) ordered.push(found)
    else ordered.push({
      id: v,
      vessel: v,
      stenosis: 0,
      timiFlow: 3,
      features: [],
      isTarget: false,
    })
  }
  for (const f of findings) {
    if (!MAIN_VESSELS.includes(f.vessel)) ordered.push(f)
  }

  const lines = ordered.map(findingSentence)
  const targets = findings.filter((f) => f.isTarget)
  if (targets.length === 1) {
    lines.push(`Target vessel: ${locationShort(targets[0].vessel, targets[0].segment)}.`)
  } else if (targets.length > 1) {
    const list = targets.map((t) => locationShort(t.vessel, t.segment))
    const last = list.pop()
    lines.push(`Target vessels: ${list.join(', ')} and ${last}.`)
  }
  return lines.join(' ')
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
      const parked = w.parkedSegment ?? 'distal'
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

function procedureSection(events: ProcedureEvent[]): string {
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
  const hasStent = p.events.some((e) => e.kind === 'stent')
  return hasStent ? 'PTCA & STENTING — PROCEDURE NOTE' : 'PTCA — PROCEDURE NOTE'
}

export function generateNote(procedure: Procedure): string {
  if (procedure.noteOverride?.trim()) {
    const body = procedure.noteOverride.trim()
    return body.includes(DISCLAIMER) ? body : `${body}\n\n${DISCLAIMER}`
  }

  const timeRange =
    procedure.patient.startTime && procedure.closure.endTime
      ? `${procedure.patient.startTime} – ${procedure.closure.endTime}`
      : procedure.patient.startTime || '____'

  const blocks: string[] = [
    heading(procedure),
    '',
    patientLine(procedure),
    `Hospital No: ${procedure.patient.hospitalId.trim() || '____'}`,
    `Date: ${fmtDisplayDate(procedure.patient.date)}`,
    `Time: ${timeRange}`,
    `Indication: ${indicationNarrative(procedure.indication)}`,
  ]

  if (procedure.operators.length) {
    blocks.push(`Operators: ${procedure.operators.join(', ')}`)
  }

  blocks.push(
    '',
    'ACCESS',
    accessNarrative(procedure.access),
    '',
    'CORONARY ANGIOGRAM',
    angioNarrative(procedure.baselineAngio),
    '',
    'PROCEDURE',
    procedureSection(procedure.events),
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

  if (procedure.notes.trim()) {
    blocks.push('', 'NOTES', procedure.notes.trim())
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
