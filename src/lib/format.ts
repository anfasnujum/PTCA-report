import { ANGIO_FEATURES, CAG_ADVICES, CAG_IMPRESSIONS, LAD_BRANCH_NOTE_SEGMENTS } from '@/lib/constants'
import type { AngioFinding, CagAdvice, CagImpression, FindingType, PlaqueGrade, Segment, TimiFlow, Vessel } from '@/types/procedure'

export const DISCLAIMER =
  'Not a medical device — documentation aid only. Verify all entries before signing.'

export function fmtMm(n: number): string {
  const s = n.toFixed(2)
  if (s.endsWith('00')) return `${n.toFixed(0)}.0`
  if (s.endsWith('0')) return n.toFixed(1)
  return s
}

export function fmtSize(diameterMm: number, lengthMm: number): string {
  return `${fmtMm(diameterMm)} × ${lengthMm} mm`
}

export function timiRoman(n: TimiFlow): string {
  return (['0', 'I', 'II', 'III'] as const)[n]
}

export function hasTimiFlow(f: Pick<AngioFinding, 'timiFlow'>): f is AngioFinding & { timiFlow: TimiFlow } {
  return f.timiFlow === 0 || f.timiFlow === 1 || f.timiFlow === 2 || f.timiFlow === 3
}

export function fmtDisplayDate(iso: string): string {
  if (!iso) return '____'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function nowHm(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export const SEGMENTS: Segment[] = ['ostial', 'ostioproximal', 'proximal', 'mid', 'distal']
export const ALL_SEGMENTS: Segment[] = [
  'ostial',
  'ostioproximal',
  'proximal',
  'proximal-mid',
  'mid',
  'mid-distal',
  'distal',
]
const ANATOMIC_SEGMENTS: Segment[] = [
  'ostial',
  'ostioproximal',
  'proximal',
  'proximal-mid',
  'mid',
  'mid-distal',
  'distal',
]

export function segmentsFor(vessel: Vessel): Segment[] {
  return vessel === 'LMCA' ? SEGMENTS : ALL_SEGMENTS
}

export function asSegments(segment?: Segment | Segment[] | string): Segment[] {
  if (!segment) return []
  const order: Segment[] = [...ALL_SEGMENTS, 'other']
  const raw = Array.isArray(segment) ? segment : [segment]
  const allowed = new Set<string>(order)
  const picked = new Set<Segment>()
  for (const s of raw) {
    if (allowed.has(s)) picked.add(s as Segment)
  }
  return order.filter((s) => picked.has(s))
}

export function primarySegment(segment?: Segment | Segment[] | string): Segment | undefined {
  return asSegments(segment)[0]
}

export function selectSegment(
  current: Segment | Segment[] | string | undefined,
  s: Segment,
): Segment | undefined {
  return primarySegment(current) === s ? undefined : s
}

export function formatAnatomicSegments(segment?: Segment | Segment[] | string): string {
  const list = asSegments(segment).filter((s) => s !== 'other')
  if (!list.length) return ''
  if (list.length === 1) return list[0]
  const idxs = list.map((s) => ANATOMIC_SEGMENTS.indexOf(s))
  const contiguous = idxs.every((n, i) => i === 0 || n === idxs[i - 1] + 1)
  if (contiguous) return `${list[0]} to ${list[list.length - 1]}`
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

export function formatSegments(segment?: Segment | Segment[] | string): string {
  return formatAnatomicSegments(segment)
}

export function distalNoteValue(
  segment?: Segment | Segment[] | string,
  note?: string,
  custom?: string,
): string {
  if (!asSegments(segment).includes('distal')) return ''
  const choice = note?.trim() ?? ''
  if (!choice) return ''
  if (choice === 'Other') return custom?.trim() ?? ''
  return choice
}

export function showsLadBranchNotes(
  vessel: Vessel,
  segment?: Segment | Segment[] | string,
): boolean {
  if (vessel !== 'LAD') return false
  const seg = primarySegment(segment)
  return !!seg && (LAD_BRANCH_NOTE_SEGMENTS as readonly string[]).includes(seg)
}

export function ladBranchNoteValue(
  f: Pick<AngioFinding, 'vessel' | 'segment' | 'ladBranch' | 'ladInvolvement'>,
): string {
  if (!showsLadBranchNotes(f.vessel, f.segment)) return ''
  const branch = f.ladBranch?.trim()
  if (!branch || !f.ladInvolvement) return ''
  if (f.ladInvolvement === 'bifurcation') return `involving the bifurcation of ${branch}`
  if (f.ladInvolvement === 'ostium') return `involving ${branch} ostium`
  return ''
}

export function showsLcxBranchNotes(
  vessel: Vessel,
  segment?: Segment | Segment[] | string,
): boolean {
  if (vessel !== 'LCX') return false
  const seg = primarySegment(segment)
  return !!seg && seg !== 'other'
}

export function lcxBranchNoteValue(
  f: Pick<AngioFinding, 'vessel' | 'segment' | 'lcxBranch' | 'lcxInvolvement'>,
): string {
  if (!showsLcxBranchNotes(f.vessel, f.segment)) return ''
  const branch = f.lcxBranch?.trim()
  if (!branch || !f.lcxInvolvement) return ''
  if (f.lcxInvolvement === 'bifurcation') return `involving the bifurcation of ${branch}`
  if (f.lcxInvolvement === 'ostium') return `involving ${branch} ostium`
  return ''
}

export function findingNoteValue(
  f: Pick<
    AngioFinding,
    | 'vessel'
    | 'segment'
    | 'distalNote'
    | 'distalNoteCustom'
    | 'ladBranch'
    | 'ladInvolvement'
    | 'lcxBranch'
    | 'lcxInvolvement'
  >,
): string {
  if (f.vessel === 'Ramus') return ''
  return (
    ladBranchNoteValue(f) ||
    lcxBranchNoteValue(f) ||
    distalNoteValue(f.segment, f.distalNote, f.distalNoteCustom)
  )
}

export function segmentClause(
  segment?: Segment | Segment[] | string,
  distalNote?: string,
): string {
  const list = asSegments(segment)
  if (!list.length && !distalNote) return ''
  const anatomic = formatAnatomicSegments(list)
  let loc = ''
  if (anatomic) {
    loc =
      list.filter((s) => s !== 'other').length === 1
        ? ` in the ${anatomic} segment`
        : ` in the ${anatomic} segments`
  }
  const note = distalNote?.trim()
  if (!note) return loc
  const tail = note.charAt(0).toLowerCase() + note.slice(1)
  return loc ? `${loc} ${tail}` : ` ${tail}`
}

export function locationShort(vessel: Vessel, segment?: Segment | Segment[] | string): string {
  const phrase = formatSegments(segment)
  return phrase ? `${phrase} ${vessel}` : vessel
}

export function findingSubject(
  vessel: Vessel,
  segment?: Segment | Segment[] | string,
): string {
  return capitalise(locationShort(vessel, segment))
}

export function article(word: string): string {
  const w = word.trim()
  if (/^NC\b/i.test(w) || /^[aeiou]/i.test(w)) return 'an'
  return 'a'
}

export function capitalise(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const LEFT_VESSELS: Vessel[] = [
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
  'Ramus',
]
export const RIGHT_VESSELS: Vessel[] = ['RCA', 'Conus', 'AM', 'PDA', 'PLV']
export const VESSELS: Vessel[] = [...LEFT_VESSELS, ...RIGHT_VESSELS]

export const VESSEL_LONG: Record<Vessel, string> = {
  LMCA: 'left main coronary artery',
  LAD: 'left anterior descending artery',
  D1: 'first diagonal',
  D2: 'second diagonal',
  D3: 'third diagonal',
  S1: 'first septal',
  LCX: 'left circumflex artery',
  OM1: 'first obtuse marginal',
  OM2: 'second obtuse marginal',
  OM3: 'third obtuse marginal',
  Ramus: 'ramus intermedius',
  RCA: 'right coronary artery',
  Conus: 'conus branch',
  AM: 'acute marginal',
  PDA: 'posterior descending artery',
  PLV: 'posterior left ventricular branch',
}

export const MAIN_VESSELS: Vessel[] = ['LMCA', 'LAD', 'LCX', 'RCA']
export const REPORT_VESSEL_ORDER: Vessel[] = ['LMCA', 'LAD', 'Ramus', 'LCX', 'RCA']
export const LAD_REPORT_BRANCHES: Vessel[] = ['D1', 'D2', 'D3', 'S1']
export const LCX_REPORT_BRANCHES: Vessel[] = ['OM1', 'OM2', 'OM3']

export const SIZE_VESSELS: Vessel[] = ['Ramus', 'D1', 'D2', 'D3', 'OM1', 'OM2', 'OM3', 'PDA', 'PLV']

export function isOmVessel(vessel: Vessel): boolean {
  return vessel === 'OM1' || vessel === 'OM2' || vessel === 'OM3'
}

export function isSizeVessel(vessel: Vessel): boolean {
  return SIZE_VESSELS.includes(vessel)
}

export function vesselReportName(f: Pick<AngioFinding, 'vessel' | 'omMajor'>): string {
  if (isOmVessel(f.vessel) && f.omMajor) return `${f.vessel} - Major OM`
  return f.vessel
}

export function findingLocationShort(
  f: Pick<AngioFinding, 'vessel' | 'segment' | 'omMajor'>,
): string {
  const phrase = formatSegments(f.segment)
  const name = vesselReportName(f)
  return phrase ? `${phrase} ${name}` : name
}

export function isRightCoronary(vessel: Vessel): boolean {
  return RIGHT_VESSELS.includes(vessel)
}

export function defaultDiameter(vessel: Vessel, segment?: Segment | Segment[] | string): number {
  const s = primarySegment(segment)
  if (vessel === 'LMCA') return 4.0
  if (vessel === 'LAD') {
    if (s === 'proximal' || s === 'ostial' || s === 'ostioproximal' || s === 'proximal-mid') return 3.5
    if (s === 'distal') return 2.5
    return 3.0
  }
  if (vessel === 'LCX') {
    if (s === 'proximal' || s === 'ostial' || s === 'ostioproximal' || s === 'proximal-mid') return 3.25
    return 3.0
  }
  if (vessel === 'RCA') {
    if (s === 'proximal' || s === 'ostial' || s === 'ostioproximal' || s === 'proximal-mid') return 3.5
    if (s === 'distal') return 3.0
    return 3.25
  }
  if (vessel === 'Ramus') return 2.75
  if (vessel === 'D1' || vessel === 'OM1') return 2.5
  if (vessel === 'Conus' || vessel === 'S1') return 2.25
  return 2.5
}

export function defaultBalloonType(name: string): import('@/types/procedure').BalloonType {
  const n = name.toLowerCase()
  if (n.includes('nc ') || n.startsWith('nc') || n.includes('accuforce') || n.includes('quantum')) {
    return 'non-compliant'
  }
  if (n.includes('cut') || n.includes('wolverine') || n.includes('flextome')) return 'cutting'
  if (n.includes('score') || n.includes('angiosculpt')) return 'scoring'
  if (n.includes('agent') || n.includes('seQuent') || n.includes('dcb') || n.includes('drug')) {
    return 'drug-coated'
  }
  return 'semi-compliant'
}

export function round025(n: number): number {
  return Math.round(n * 4) / 4
}

export function lmcaLengthMode(f: AngioFinding): 'category' | 'mm' {
  if (f.lengthMode === 'mm' || f.lengthMode === 'category') return f.lengthMode
  if (f.lengthMm) return 'mm'
  return 'category'
}

export const DEFAULT_STENOSIS_RANGE = 10

export type StenosisFields = Pick<
  AngioFinding,
  'stenosis' | 'stenosisMode' | 'stenosisTo' | 'stenosisRange'
>

export function stenosisModeOf(f: Pick<AngioFinding, 'stenosisMode'>): 'single' | 'range' {
  return f.stenosisMode === 'range' ? 'range' : 'single'
}

export function stenosisRangeOf(f: StenosisFields): number {
  if (typeof f.stenosisRange === 'number' && Number.isFinite(f.stenosisRange) && f.stenosisRange >= 0) {
    return f.stenosisRange
  }
  if (typeof f.stenosisTo === 'number' && Number.isFinite(f.stenosisTo)) {
    return Math.max(0, f.stenosisTo - f.stenosis)
  }
  return DEFAULT_STENOSIS_RANGE
}

export function stenosisBounds(f: StenosisFields): { from: number; to: number } {
  if (stenosisModeOf(f) !== 'range') return { from: f.stenosis, to: f.stenosis }
  const from = f.stenosis
  const to = Math.min(100, from + stenosisRangeOf(f))
  return { from, to }
}

export function stenosisMax(f: StenosisFields): number {
  return stenosisBounds(f).to
}

export function formatStenosis(f: StenosisFields): string {
  if (stenosisModeOf(f) === 'range') {
    const { from, to } = stenosisBounds(f)
    if (from === to) return `${from}%`
    return `${from}–${to}%`
  }
  return `${f.stenosis}%`
}

export function findingTypeOf(f: Pick<AngioFinding, 'findingType'>): FindingType {
  if (
    f.findingType === 'plaque' ||
    f.findingType === 'lesion' ||
    f.findingType === 'normal' ||
    f.findingType === 'stenosis'
  ) {
    return f.findingType
  }
  return 'stenosis'
}

export function findingNoun(f: Pick<AngioFinding, 'findingType'>): 'plaque' | 'stenosis' | 'lesion' | 'normal' {
  return findingTypeOf(f)
}

export function formatFindingPhrase(
  f: Pick<
    AngioFinding,
    'findingType' | 'plaqueGrade' | 'plaqueOther' | 'stenosis' | 'stenosisMode' | 'stenosisTo' | 'stenosisRange'
  >,
): string {
  const type = findingTypeOf(f)
  if (type === 'normal') return 'Normal'
  if (type === 'plaque') {
    if (f.plaqueGrade === 'other') {
      const custom = (f.plaqueOther ?? '').trim().replace(/%+$/, '').trim()
      const grade = custom ? `${custom}% ` : ''
      return `${grade}plaque`
    }
    const grade = f.plaqueGrade ? `${f.plaqueGrade} ` : ''
    return `${grade}plaque`
  }
  return `${formatStenosis(f)} ${type}`
}

export function featureLabel(feat: string): string {
  return feat === 'CTO' ? 'CTO' : capitalise(feat)
}

export function formatFeatureList(features: string[]): string {
  const known = ANGIO_FEATURES.filter((f) => f !== 'CTO' && features.includes(f))
  const unknown = features.filter(
    (f) => f !== 'CTO' && !(ANGIO_FEATURES as readonly string[]).includes(f),
  )
  return [...known, ...unknown].join(', ')
}

export function isChronicTotalOcclusion(
  f: Pick<AngioFinding, 'features' | 'findingType' | 'stenosis'>,
): boolean {
  if (f.features.includes('CTO')) return true
  if (findingTypeOf(f) === 'plaque') return false
  return f.stenosis === 100
}

export function formatDescribedFinding(f: AngioFinding): string {
  const feats = formatFeatureList(f.features)
  const finding = isChronicTotalOcclusion(f) ? 'chronic total occlusion' : formatFindingPhrase(f)
  return feats ? `${feats}, ${finding}` : finding
}

export function findingSeverity(f: AngioFinding): number {
  if (findingTypeOf(f) === 'normal') return 0
  if (findingTypeOf(f) === 'plaque') {
    if (f.plaqueGrade === 'other') {
      const n = Number.parseFloat((f.plaqueOther ?? '').trim())
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
    }
    const rank: Record<Exclude<PlaqueGrade, 'other'>, number> = {
      minor: 20,
      mild: 40,
      moderate: 60,
      severe: 85,
    }
    return f.plaqueGrade ? rank[f.plaqueGrade] : 0
  }
  return stenosisMax(f)
}

export function isUnremarkableFinding(f: AngioFinding): boolean {
  if (findingTypeOf(f) === 'normal') return f.features.length === 0
  if (f.features.length) return false
  if (findingTypeOf(f) === 'plaque') {
    if (f.plaqueGrade === 'other') return !(f.plaqueOther ?? '').trim()
    return !f.plaqueGrade
  }
  return stenosisMax(f) === 0
}

export function lmcaLengthLabel(f: AngioFinding): string {
  if (f.vessel !== 'LMCA' || f.separateOrigin) return ''
  if (lmcaLengthMode(f) === 'mm') {
    const n = Number.parseFloat(String(f.lengthMm ?? ''))
    if (Number.isFinite(n) && n > 0) return `${String(n)} mm`
    return ''
  }
  if (f.lengthCategory) return capitalise(f.lengthCategory)
  return ''
}

export function ladTypeLabel(f: Pick<AngioFinding, 'vessel' | 'ladType'>): string {
  if (f.vessel !== 'LAD' || !f.ladType) return ''
  return `Type ${f.ladType} Vessel`
}

export function ladRemarkValue(
  f: Pick<AngioFinding, 'vessel' | 'ladRemarkOpen' | 'ladRemark'>,
): string {
  if (f.vessel !== 'LAD' || !f.ladRemarkOpen) return ''
  return (f.ladRemark ?? '').trim()
}

export function ladLeadClause(
  f: Pick<AngioFinding, 'vessel' | 'ladType' | 'ladRemarkOpen' | 'ladRemark'>,
): string {
  const type = ladTypeLabel(f)
  const remark = ladRemarkValue(f)
  if (type && remark) return /^[,;:]/.test(remark) ? `${type}${remark}` : `${type}, ${remark}`
  if (type) return type
  if (remark) return capitalise(remark).replace(/[.!?]+$/, '')
  return ''
}

export function lcxDominanceLabel(f: Pick<AngioFinding, 'vessel' | 'lcxDominance'>): string {
  if (f.vessel !== 'LCX' || !f.lcxDominance) return ''
  return dominanceVesselPhrase(f.lcxDominance)
}

export function rcaDominanceLabel(f: Pick<AngioFinding, 'vessel' | 'rcaDominance'>): string {
  if (f.vessel !== 'RCA' || !f.rcaDominance) return ''
  return dominanceVesselPhrase(f.rcaDominance)
}

function dominanceVesselPhrase(value: 'dominant' | 'non-dominant' | 'co-dominant'): string {
  if (value === 'dominant') return 'Dominant vessel'
  if (value === 'co-dominant') return 'Co-dominant vessel'
  return 'Non dominant vessel'
}

export function rcaRemarkValue(
  f: Pick<AngioFinding, 'vessel' | 'rcaRemarkOpen' | 'rcaRemark'>,
): string {
  if (f.vessel !== 'RCA' || !f.rcaRemarkOpen) return ''
  return (f.rcaRemark ?? '').trim()
}

export function rcaLeadClause(
  f: Pick<AngioFinding, 'vessel' | 'rcaDominance' | 'rcaRemarkOpen' | 'rcaRemark'>,
): string {
  const dominance = rcaDominanceLabel(f)
  const remark = rcaRemarkValue(f)
  if (dominance && remark) return /^[,;:]/.test(remark) ? `${dominance}${remark}` : `${dominance}, ${remark}`
  if (dominance) return dominance
  if (remark) return capitalise(remark).replace(/[.!?]+$/, '')
  return ''
}

export function ramusSizeLabel(f: Pick<AngioFinding, 'vessel' | 'ramusSize'>): string {
  if (!isSizeVessel(f.vessel) || !f.ramusSize) return ''
  if (f.ramusSize === 'good') return 'Good sized vessel'
  if (f.ramusSize === 'medium') return 'Medium sized vessel'
  return 'Small sized vessels'
}

export function toggleCagImpression(
  selected: CagImpression[],
  id: CagImpression,
): CagImpression[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id)
  return [...selected, id]
}

export function toggleCagAdvice(selected: CagAdvice[], id: CagAdvice): CagAdvice[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id)
  return [...selected, id]
}

export function addCagCustomImpression(list: string[], value: string): string[] {
  const v = value.trim().replace(/[.]+$/, '')
  if (!v) return list
  if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return list
  return [...list, v]
}

function listedLine(text: string): string {
  const t = text.trim().replace(/[.]+$/, '')
  if (!t) return ''
  return `${t}.`
}

function listedSentence(
  options: readonly { id: string; label: string; report?: string }[],
  selected?: string[],
  custom?: string[],
): string {
  const presets = options
    .filter((o) => (selected ?? []).includes(o.id))
    .map((o) => o.report ?? o.label)
  const extras = (custom ?? []).map((s) => s.trim().replace(/[.]+$/, '')).filter(Boolean)
  const labels = [...presets, ...extras].map(listedLine).filter(Boolean)
  if (!labels.length) return 'Not recorded.'
  return labels.join('\n')
}

export function cagImpressionSentence(
  selected?: CagImpression[],
  custom?: string[],
): string {
  return listedSentence(CAG_IMPRESSIONS, selected, custom)
}

export function cagAdviceSentence(selected?: CagAdvice[], custom?: string[]): string {
  return listedSentence(CAG_ADVICES, selected, custom)
}

export function cagArterialGraftLine(
  name: 'LIMA' | 'RIMA',
  on?: boolean,
  note?: string,
): string | null {
  if (!on) return null
  return `${name} : ${(note ?? '').trim()}`
}

export function isLadOtherSegment(
  f: Pick<AngioFinding, 'vessel' | 'segment'>,
): boolean {
  return f.vessel === 'LAD' && primarySegment(f.segment) === 'other'
}

export function freeTextSentence(text?: string): string {
  const t = (text ?? '').trim()
  if (!t) return ''
  const started = capitalise(t)
  return /[.!?]$/.test(started) ? started : `${started}.`
}

export function ladOtherSentence(
  f: Pick<AngioFinding, 'vessel' | 'segment' | 'segmentOther' | 'ladType' | 'ladRemarkOpen' | 'ladRemark'>,
): string {
  const custom = freeTextSentence(f.segmentOther)
  const lead = ladLeadClause(f)
  if (lead && custom) return `LAD: ${lead}. ${custom}`
  if (lead) return `LAD: ${lead}.`
  if (custom) return `LAD: ${custom}`
  return 'LAD: Normal.'
}

export function lmcaQualifierBits(f: AngioFinding): string[] {
  if (f.vessel !== 'LMCA') return []
  if (f.separateOrigin) return ['separate origin of LAD and LCX']
  const length = lmcaLengthLabel(f)
  return length ? [length] : []
}

export const BALLOON_DIAMETERS = [
  1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0,
]

export const STENT_DIAMETERS = [2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0]

export const BALLOON_LENGTHS = [6, 8, 10, 12, 15, 20, 25, 30, 35, 40]

export const STENT_LENGTHS = [8, 12, 15, 16, 18, 20, 22, 24, 28, 32, 33, 38, 40, 48]

export const ATM_VALUES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]

export const SECOND_VALUES = [5, 10, 15, 20, 30, 45, 60]

export const STENOSIS_PRESETS = [0, 30, 40, 50, 70, 80, 90, 95, 99, 100]
