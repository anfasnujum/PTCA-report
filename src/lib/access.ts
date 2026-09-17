import type { Access, AccessSite, CatalogueItem } from '@/types/procedure'
import { CATHETER_SIZES, FEMORAL_SHEATHS, RADIAL_SHEATHS } from '@/lib/constants'

export function formatLabAccess(access: Pick<Access, 'site' | 'side'>): string {
  const side = access.side ? `${access.side.charAt(0).toUpperCase()}${access.side.slice(1)}` : ''
  return [side, access.site].filter(Boolean).join(' ')
}

export function accessNarrative(a: Access, opts?: { includeSheath?: boolean }): string {
  const includeSheath = opts?.includeSheath !== false
  if (!a.site || !a.side) {
    const parts = [a.side, a.site, includeSheath ? a.sheathSize : ''].filter(Boolean)
    return parts.length ? `${parts.join(' ')} access.` : 'Access not recorded.'
  }
  const artery = a.site === 'distal radial' ? 'distal radial artery' : `${a.site} artery`
  const side = `${a.side.charAt(0).toUpperCase()}${a.side.slice(1)}`
  if (includeSheath && a.sheathSize) {
    return `${side} ${artery}; ${a.sheathSize} sheath inserted.`
  }
  return `${side} ${artery}.`
}

export function accessSpecialNote(a: Access): string {
  const choice = a.specialNote?.trim() ?? ''
  if (!choice) return ''
  const value = choice === 'Other' ? (a.specialNoteCustom?.trim() ?? '') : choice
  return value
}

export function accessSpecialNoteLine(a: Access): string | null {
  const value = accessSpecialNote(a)
  return value ? `Special Notes: ${value}` : null
}

export function formatCatheterLabel(size: string, curve: string): string {
  return [size, curve].filter((part) => part.trim()).join(' ')
}

export function parseCatheterLabel(value: string): { size: string; curve: string } {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d+(?:\.\d+)?F)\s+(.+)$/i)
  if (match?.[1] && match[2]) {
    return { size: match[1].toUpperCase(), curve: match[2].trim() }
  }
  return { size: '5F', curve: trimmed }
}

export function defaultCatheterSize(sheathSize: Access['sheathSize']): string {
  if (CATHETER_SIZES.includes(sheathSize as (typeof CATHETER_SIZES)[number])) return sheathSize
  return '5F'
}

export type SheathAccessGroup = 'radial' | 'femoral'

export function sheathAccessGroup(site: AccessSite): SheathAccessGroup {
  return site === 'femoral' || site === 'brachial' ? 'femoral' : 'radial'
}

export function presetSheathsForSite(site: AccessSite): readonly string[] {
  return sheathAccessGroup(site) === 'femoral' ? FEMORAL_SHEATHS : RADIAL_SHEATHS
}

export function sheathsForSite(
  site: AccessSite,
  catalogue: Pick<CatalogueItem, 'category' | 'name' | 'meta'>[] = [],
  selected = '',
): string[] {
  const group = sheathAccessGroup(site)
  const seen = new Set<string>()
  const next: string[] = []
  const add = (name: string) => {
    const value = name.trim()
    const key = value.toLowerCase()
    if (!value || seen.has(key)) return
    seen.add(key)
    next.push(value)
  }
  for (const name of presetSheathsForSite(site)) add(name)
  for (const item of catalogue) {
    if (item.category !== 'sheath') continue
    const itemGroup = item.meta.accessGroup || 'all'
    if (itemGroup === group || itemGroup === 'all') add(item.name)
  }
  add(selected)
  return next
}

export function sheathAllowedForSite(
  brand: string,
  site: AccessSite,
  catalogue: Pick<CatalogueItem, 'category' | 'name' | 'meta'>[] = [],
): boolean {
  if (!brand.trim()) return true
  return sheathsForSite(site, catalogue).some((name) => name.toLowerCase() === brand.trim().toLowerCase())
}

const GENERIC_TO_BRAND: Record<string, string> = {
  iohexol: 'Omnipaque',
  iodixanol: 'Visipaque',
  iobitridol: 'Xenetix',
  iopromide: 'Ultravist',
  iomeprol: 'Iomeron',
  ioversol: 'Optiray',
  iopamidol: 'Iopamiro',
}

const KNOWN_BRANDS = [
  'Omnipaque',
  'Visipaque',
  'Xenetix',
  'Ultravist',
  'Iomeron',
  'Optiray',
  'Iopamiro',
  'Isovue',
  'Glandvida',
] as const

export function normalizeContrastAgent(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  const lower = value.toLowerCase()
  const brand = KNOWN_BRANDS.find((name) => name.toLowerCase() === lower)
  if (brand) return brand
  for (const [generic, mapped] of Object.entries(GENERIC_TO_BRAND)) {
    if (lower === generic || lower.includes(generic)) return mapped
  }
  return value
}

export function formatContrastLabel(agent: string, volumeMl: number | ''): string {
  const name = agent.trim()
  if (!name && volumeMl === '') return ''
  if (!name) return `${volumeMl} mL`
  if (volumeMl === '') return name
  return `${name} ${volumeMl} mL`
}

export function parseContrastLabel(value: string): { agent: string; volumeMl: number | '' } {
  const trimmed = value.trim()
  if (!trimmed) return { agent: '', volumeMl: '' }
  const prefix = trimmed.match(/^(\d+)\s*mL?\s+(.+)$/i)
  if (prefix?.[1] && prefix[2]) {
    return { agent: normalizeContrastAgent(prefix[2]), volumeMl: Number(prefix[1]) }
  }
  const suffix = trimmed.match(/^(.+?)\s+(\d+)\s*mL?$/i)
  if (suffix?.[1] && suffix[2]) {
    return { agent: normalizeContrastAgent(suffix[1]), volumeMl: Number(suffix[2]) }
  }
  return { agent: normalizeContrastAgent(trimmed), volumeMl: '' }
}

/** Keeps systolic/diastolic as 120/80 by inserting `/` after the third digit. */
export function formatAorticPressureInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)}/${digits.slice(3)}`
}

export function formatAorticPressureDisplay(raw: string): string {
  const pressure = raw.trim()
  if (!pressure) return ''
  return /mm\s*hg$/i.test(pressure) ? pressure : `${pressure} mmHg`
}
