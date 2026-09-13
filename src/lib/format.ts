import type { Segment, TimiFlow, Vessel } from '@/types/procedure'

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

export const SEGMENTS: Segment[] = ['ostial', 'proximal', 'mid', 'distal', 'diffuse']
const ANATOMIC_SEGMENTS: Segment[] = ['ostial', 'proximal', 'mid', 'distal']

export function asSegments(segment?: Segment | Segment[] | string): Segment[] {
  if (!segment) return []
  const raw = Array.isArray(segment) ? segment : [segment]
  const allowed = new Set<string>(SEGMENTS)
  const picked = new Set<Segment>()
  for (const s of raw) {
    if (allowed.has(s)) picked.add(s as Segment)
  }
  return SEGMENTS.filter((s) => picked.has(s))
}

export function toggleSegment(current: Segment | Segment[] | string | undefined, s: Segment): Segment[] {
  const list = asSegments(current)
  return list.includes(s) ? list.filter((x) => x !== s) : asSegments([...list, s])
}

export function primarySegment(segment?: Segment | Segment[] | string): Segment | undefined {
  return asSegments(segment)[0]
}

export function formatAnatomicSegments(segment?: Segment | Segment[] | string): string {
  const list = asSegments(segment).filter((s) => s !== 'diffuse')
  if (!list.length) return ''
  if (list.length === 1) return list[0]
  const idxs = list.map((s) => ANATOMIC_SEGMENTS.indexOf(s))
  const contiguous = idxs.every((n, i) => i === 0 || n === idxs[i - 1] + 1)
  if (contiguous) return `${list[0]} to ${list[list.length - 1]}`
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

export function formatSegments(segment?: Segment | Segment[] | string): string {
  const list = asSegments(segment)
  const anatomic = formatAnatomicSegments(list)
  const diffuse = list.includes('diffuse')
  if (diffuse && anatomic) return `diffuse ${anatomic}`
  if (diffuse) return 'diffuse'
  return anatomic
}

export function segmentClause(segment?: Segment | Segment[] | string): string {
  const list = asSegments(segment)
  if (!list.length) return ''
  const anatomic = formatAnatomicSegments(list)
  const diffuse = list.includes('diffuse')
  if (!anatomic) return diffuse ? ' that is diffuse' : ''
  const loc = list.filter((s) => s !== 'diffuse').length === 1
    ? ` in the ${anatomic} segment`
    : ` in the ${anatomic} segments`
  return diffuse ? `${loc} (diffuse)` : loc
}

export function locationShort(vessel: Vessel, segment?: Segment | Segment[] | string): string {
  const phrase = formatSegments(segment)
  return phrase ? `${phrase} ${vessel}` : vessel
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

export function isRightCoronary(vessel: Vessel): boolean {
  return RIGHT_VESSELS.includes(vessel)
}

export function defaultDiameter(vessel: Vessel, segment?: Segment | Segment[] | string): number {
  const s = primarySegment(segment)
  if (vessel === 'LMCA') return 4.0
  if (vessel === 'LAD') {
    if (s === 'proximal' || s === 'ostial') return 3.5
    if (s === 'distal') return 2.5
    return 3.0
  }
  if (vessel === 'LCX') {
    if (s === 'proximal' || s === 'ostial') return 3.25
    return 3.0
  }
  if (vessel === 'RCA') {
    if (s === 'proximal' || s === 'ostial') return 3.5
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

export const BALLOON_DIAMETERS = [
  1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0,
]

export const STENT_DIAMETERS = [2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0]

export const BALLOON_LENGTHS = [6, 8, 10, 12, 15, 20, 25, 30, 35, 40]

export const STENT_LENGTHS = [8, 12, 15, 16, 18, 20, 22, 24, 28, 32, 33, 38, 40, 48]

export const ATM_VALUES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]

export const SECOND_VALUES = [5, 10, 15, 20, 30, 45, 60]

export const STENOSIS_PRESETS = [0, 30, 40, 50, 70, 80, 90, 95, 99, 100]
