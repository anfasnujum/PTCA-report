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

export function locationShort(vessel: Vessel, segment?: Segment | string): string {
  return segment ? `${segment} ${vessel}` : vessel
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

export const VESSELS: Vessel[] = [
  'LMCA',
  'LAD',
  'D1',
  'D2',
  'LCX',
  'OM1',
  'OM2',
  'Ramus',
  'RCA',
  'PDA',
  'PLV',
]

export const LEFT_VESSELS: Vessel[] = ['LMCA', 'LAD', 'D1', 'D2', 'LCX', 'OM1', 'OM2', 'Ramus']
export const RIGHT_VESSELS: Vessel[] = ['RCA', 'PDA', 'PLV']

export const VESSEL_LONG: Record<Vessel, string> = {
  LMCA: 'left main coronary artery',
  LAD: 'left anterior descending artery',
  D1: 'first diagonal',
  D2: 'second diagonal',
  LCX: 'left circumflex artery',
  OM1: 'first obtuse marginal',
  OM2: 'second obtuse marginal',
  Ramus: 'ramus intermedius',
  RCA: 'right coronary artery',
  PDA: 'posterior descending artery',
  PLV: 'posterior left ventricular branch',
}

export const SEGMENTS: Segment[] = ['ostial', 'proximal', 'mid', 'distal']

export const MAIN_VESSELS: Vessel[] = ['LMCA', 'LAD', 'LCX', 'RCA']

export function defaultDiameter(vessel: Vessel, segment?: Segment | string): number {
  if (vessel === 'LMCA') return 4.0
  if (vessel === 'LAD') {
    if (segment === 'proximal' || segment === 'ostial') return 3.5
    if (segment === 'distal') return 2.5
    return 3.0
  }
  if (vessel === 'LCX') {
    if (segment === 'proximal' || segment === 'ostial') return 3.25
    return 3.0
  }
  if (vessel === 'RCA') {
    if (segment === 'proximal' || segment === 'ostial') return 3.5
    if (segment === 'distal') return 3.0
    return 3.25
  }
  if (vessel === 'Ramus') return 2.75
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
