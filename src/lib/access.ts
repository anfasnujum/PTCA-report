import type { Access } from '@/types/procedure'
import { CATHETER_SIZES } from '@/lib/constants'

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
