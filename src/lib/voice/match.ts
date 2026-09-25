import { FEMORAL_SHEATHS, RADIAL_SHEATHS, SHEATH_SIZES } from '@/lib/constants'
import { VESSEL_LONG, VESSELS } from '@/lib/format'
import type { Access, CatalogueCategory, CatalogueItem, Segment, SegmentChoice, Vessel } from '@/types/procedure'

const SEGMENT_VALUES: Segment[] = [
  'ostial',
  'ostioproximal',
  'proximal',
  'proximal-mid',
  'mid',
  'mid-distal',
  'distal',
  'other',
]

const VESSEL_ALIASES: Record<string, Vessel> = {
  lm: 'LMCA',
  lmca: 'LMCA',
  'left main': 'LMCA',
  lad: 'LAD',
  'left anterior descending': 'LAD',
  diagonal: 'D1',
  diag: 'D1',
  'first diagonal': 'D1',
  d1: 'D1',
  d2: 'D2',
  d3: 'D3',
  septal: 'S1',
  s1: 'S1',
  lcx: 'LCX',
  circumflex: 'LCX',
  'left circumflex': 'LCX',
  om: 'OM1',
  om1: 'OM1',
  om2: 'OM2',
  om3: 'OM3',
  lpda: 'LPDA',
  ramus: 'Ramus',
  ri: 'Ramus',
  rca: 'RCA',
  'right coronary': 'RCA',
  conus: 'Conus',
  am: 'AM',
  'acute marginal': 'AM',
  pda: 'PDA',
  plv: 'PLV',
}

export function normalizeSpoken(value: string): string {
  return value
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim()
}

export function resolveVessel(raw: unknown): Vessel | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const trimmed = raw.trim()
  const exact = VESSELS.find((v) => v.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact
  const key = normalizeSpoken(trimmed)
  if (VESSEL_ALIASES[key]) return VESSEL_ALIASES[key]
  return VESSELS.find((v) => normalizeSpoken(VESSEL_LONG[v]) === key)
}

export function resolveSegment(raw: unknown): SegmentChoice | undefined {
  if (Array.isArray(raw)) {
    const parts = raw.map(resolveSegment).filter((s): s is Segment => typeof s === 'string')
    if (!parts.length) return undefined
    return parts.length === 1 ? parts[0] : parts
  }
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const key = normalizeSpoken(raw).replace(/ /g, '-')
  return SEGMENT_VALUES.find((s) => s === key || s.replace(/-/g, ' ') === key.replace(/-/g, ' '))
}

export function matchCatalogueName(
  items: CatalogueItem[],
  category: CatalogueCategory,
  spoken: string,
): string {
  return matchCatalogueHit(items, category, spoken)?.name || spoken.trim()
}

export function matchCatalogueHit(
  items: CatalogueItem[],
  category: CatalogueCategory,
  spoken: string,
): { name: string; score: number } | undefined {
  const needle = normalizeSpoken(spoken)
  if (!needle) return undefined
  const pool = items.filter((item) => item.category === category)
  let best: { name: string; score: number } | undefined
  for (const item of pool) {
    const score = nameScore(normalizeSpoken(item.name), needle)
    if (!best || score > best.score) best = { name: item.name, score }
  }
  if (best && best.score >= 55) return best
  return undefined
}

function nameScore(name: string, spoken: string): number {
  if (name === spoken) return 100
  if (name.includes(spoken) || spoken.includes(name)) return 82
  const nameTokens = new Set(name.split(' ').filter(Boolean))
  const spokenTokens = spoken.split(' ').filter(Boolean)
  if (!spokenTokens.length) return 0
  const hit = spokenTokens.filter((t) => nameTokens.has(t) || [...nameTokens].some((n) => n.includes(t) || t.includes(n)))
  return Math.round((hit.length / spokenTokens.length) * 70)
}

export function parseStenosis(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0 && value < 1) return Math.round(value * 100)
    return Math.round(Math.min(100, Math.max(0, value)))
  }
  if (typeof value !== 'string' || !value.trim()) return undefined
  const match = value.match(/(\d+(?:\.\d+)?)/)
  if (!match) return undefined
  const n = Number(match[1])
  if (!Number.isFinite(n)) return undefined
  if (n > 0 && n < 1) return Math.round(n * 100)
  return Math.round(Math.min(100, Math.max(0, n)))
}

export function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/mm$/i, '').replace(/%$/i, '').trim())
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

const SHEATH_BRANDS = [...new Set([...RADIAL_SHEATHS, ...FEMORAL_SHEATHS])]

const SHEATH_BRAND_ALIASES: Array<[RegExp, string]> = [
  [/\bprelude(?:\s+ease)?\b/i, 'Prelude Ease'],
  [/\bglidesheath(?:\s+slender)?\b/i, 'Glidesheath Slender'],
  [/\bradifocus(?:\s+terumo)?\b/i, 'Radifocus Terumo'],
  [/\bavanti\+?\b/i, 'Avanti+'],
  [/\bterumo\s+introducer\b/i, 'Terumo Introducer'],
  [/\binput\b/i, 'Input'],
]

export function resolveSheathSize(raw: unknown): Access['sheathSize'] | undefined {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 4 && raw <= 10) {
    return `${raw}F` as Access['sheathSize']
  }
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const match = raw.trim().match(/\b(4|5|6|7|8|9|10)\s*(?:F|french)\b/i)
  const size = match ? (`${match[1]}F` as Access['sheathSize']) : undefined
  if (size && (SHEATH_SIZES as readonly string[]).includes(size)) return size
  return undefined
}

export function resolveSheathBrand(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const key = normalizeSpoken(raw)
  const exact = SHEATH_BRANDS.find((name) => normalizeSpoken(name) === key)
  if (exact) return exact
  for (const [pattern, name] of SHEATH_BRAND_ALIASES) {
    if (pattern.test(raw)) return name
  }
  return SHEATH_BRANDS.find((name) => key.includes(normalizeSpoken(name)) || normalizeSpoken(name).includes(key))
}

export type SpokenMetrics = {
  name: string
  diameterMm?: number
  lengthMm?: number
  french?: string
  atm?: number
}

export function parseSpokenMetrics(raw: string): SpokenMetrics {
  let text = raw.replace(/[×]/g, 'x')
  let diameterMm: number | undefined
  let lengthMm: number | undefined
  let french: string | undefined
  let atm: number | undefined
  const dim = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*mm)?/i)
  if (dim) {
    const d = Number(dim[1])
    const l = Number(dim[2])
    if (d >= 0.5 && d <= 6) diameterMm = d
    if (l >= 4 && l <= 60) lengthMm = l
    text = text.replace(dim[0], ' ')
  }
  text = text.replace(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*mm)?/gi, ' ')
  const frenchMatch = text.match(/\b(4|5|6|7|8|9|10)\s*(?:F|french)\b/i)
  if (frenchMatch) {
    french = `${frenchMatch[1]}F`
    text = text.replace(frenchMatch[0], ' ')
  }
  const atmMatch = text.match(/\b(\d{1,2})\s*atm\b/i)
  if (atmMatch) {
    atm = Number(atmMatch[1])
    text = text.replace(atmMatch[0], ' ')
  }
  const name = text
    .replace(/\b0\.0?14\s*"?\b/g, ' ')
    .replace(/\bmm\b/gi, ' ')
    .replace(/@/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { name, diameterMm, lengthMm, french, atm }
}

const DEVICE_ALIASES: Array<{ pattern: RegExp; category: CatalogueCategory; name: string }> = [
  { pattern: /\brun[\s-]?through\b/i, category: 'wire', name: 'Runthrough NS' },
  { pattern: /\bbmw\b/i, category: 'wire', name: 'BMW' },
  { pattern: /\bsion(?:\s+blue)?\b/i, category: 'wire', name: 'Sion Blue' },
  { pattern: /\bwhisper\b/i, category: 'wire', name: 'Whisper MS' },
  { pattern: /\bfielder\b/i, category: 'wire', name: 'Fielder XT' },
  { pattern: /\bpilot\s*50\b/i, category: 'wire', name: 'Pilot 50' },
  { pattern: /\bryurei|\breuleat|\brurei\b/i, category: 'balloon', name: 'Ryurei' },
  { pattern: /\baccu(?:force|fose)\b/i, category: 'balloon', name: 'Accuforce' },
  { pattern: /\bnc\s*sapphire\b/i, category: 'balloon', name: 'NC Sapphire' },
  { pattern: /\bsapphire\b/i, category: 'balloon', name: 'Sapphire II' },
  { pattern: /\bnc\s*trek\b/i, category: 'balloon', name: 'NC Trek' },
  { pattern: /\bemerge\b/i, category: 'balloon', name: 'Emerge' },
  { pattern: /\baperi\b/i, category: 'balloon', name: 'AperiNC' },
  { pattern: /\bsupraflex\b/i, category: 'stent', name: 'Supraflex Cruz' },
  { pattern: /\bxience\b/i, category: 'stent', name: 'Xience Sierra' },
  { pattern: /\bfinecross\b/i, category: 'microcatheter', name: 'Finecross' },
  { pattern: /\bguideliner\b/i, category: 'guideExtension', name: 'GuideLiner' },
  { pattern: /\btig\b/i, category: 'catheter', name: 'TIG' },
  { pattern: /\bjr\b/i, category: 'guide', name: 'JR' },
  { pattern: /\bjl\b/i, category: 'guide', name: 'JL' },
  { pattern: /\bebu\b/i, category: 'guide', name: 'EBU' },
]

const CLASSIFY_CATEGORIES: CatalogueCategory[] = [
  'wire',
  'balloon',
  'stent',
  'guide',
  'catheter',
  'microcatheter',
  'aspiration',
  'guideExtension',
]

export function classifySpokenDevice(
  spoken: string,
  items: CatalogueItem[] = [],
): { category: CatalogueCategory; name: string } | undefined {
  const blob = spoken.trim()
  if (!blob) return undefined
  for (const alias of DEVICE_ALIASES) {
    if (alias.pattern.test(blob)) return { category: alias.category, name: alias.name }
  }
  const cleaned = parseSpokenMetrics(blob).name
  if (!cleaned) return undefined
  let best: { category: CatalogueCategory; name: string; score: number } | undefined
  for (const category of CLASSIFY_CATEGORIES) {
    const hit = matchCatalogueHit(items, category, cleaned)
    if (!hit) continue
    if (!best || hit.score > best.score) best = { category, name: hit.name, score: hit.score }
  }
  return best
}
