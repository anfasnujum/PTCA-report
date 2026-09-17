import {
  GUIDE_DEVICE_CURVES,
  GUIDE_DEVICES,
  GUIDE_FALLBACK_CURVES,
  type GuideDevice,
} from '@/lib/constants'
import type { GuideCatheter } from '@/types/procedure'

export type GuideCatheterParts = {
  device?: string
  curve: string
}

export function isGuideDevice(value: string): value is GuideDevice {
  return (GUIDE_DEVICES as readonly string[]).includes(value)
}

export function curvesForDevice(device: string): readonly string[] {
  if (isGuideDevice(device)) return GUIDE_DEVICE_CURVES[device]
  return GUIDE_FALLBACK_CURVES
}

export function coronaryFromDevice(device: string): 'left' | 'right' {
  return /^(JR|AR|SAL|MP)/i.test(device.trim()) ? 'right' : 'left'
}

function firstCurve(device: string): string {
  return curvesForDevice(device)[0] ?? ''
}

function normalizeNumericCurve(raw: string): string {
  if (!raw) return raw
  if (/^[AB][12]$/i.test(raw)) return raw.toUpperCase()
  if (/^\d+$/.test(raw) && Number(raw) >= 3) return `${raw}.0`
  return raw
}

export function formatGuideLabel(parts: GuideCatheterParts): string {
  const device = (parts.device ?? '').trim()
  const curve = parts.curve.trim()
  if (!curve) return device
  if (/^(AL|AR)$/i.test(device)) return `${device.toUpperCase()}${curve}`
  return `${device} ${curve}`.trim()
}

export function parseGuideLabel(label: string): { device: string; curve: string } {
  const raw = label.trim()
  if (!raw) return { device: 'JR', curve: '4.0' }

  const judkins = /^(JL|JR)\s*([0-9]+(?:\.[0-9]+)?)$/i.exec(raw)
  if (judkins) return { device: judkins[1].toUpperCase(), curve: normalizeNumericCurve(judkins[2]) }

  const ebu = /^EBU\s*([0-9]+(?:\.[0-9]+)?)$/i.exec(raw)
  if (ebu) return { device: 'EBU', curve: ebu[1] }

  const xb = /^XB\s*([0-9]+(?:\.[0-9]+)?)$/i.exec(raw)
  if (xb) return { device: 'XB', curve: xb[1] }

  const amplatz = /^(AL|AR)\s*([0-9]+(?:\.[0-9]+)?)$/i.exec(raw)
  if (amplatz) return { device: amplatz[1].toUpperCase(), curve: String(Number(amplatz[2])) }

  if (/^SAL$/i.test(raw)) return { device: 'SAL', curve: '' }
  if (/^IM$/i.test(raw)) return { device: 'IM', curve: '' }

  const mp = /^MP\s*([AB][12])$/i.exec(raw)
  if (mp) return { device: 'MP', curve: mp[1].toUpperCase() }
  if (/^MP$/i.test(raw)) return { device: 'MP', curve: firstCurve('MP') }

  if (isGuideDevice(raw)) return { device: raw, curve: firstCurve(raw) }

  const generic = /^([A-Z0-9]+)\s+(.+)$/i.exec(raw)
  if (generic) return { device: generic[1].toUpperCase(), curve: generic[2] }

  return { device: raw, curve: '' }
}

export function withGuideDevice(parts: GuideCatheterParts, device: string): { device: string; curve: string } {
  const allowed = curvesForDevice(device)
  if (!allowed.length) return { device, curve: '' }
  const curve = allowed.includes(parts.curve) ? parts.curve : firstCurve(device)
  return { device, curve }
}

export function normalizeGuideCatheter(data: GuideCatheter): GuideCatheter {
  const extra = { size: data.size, vessel: data.vessel, coronary: data.coronary }
  if (data.device) {
    const allowed = curvesForDevice(data.device)
    const curve = allowed.length && data.curve && !allowed.includes(data.curve) ? firstCurve(data.device) : data.curve
    return { device: data.device, curve, ...extra }
  }
  const parsed = parseGuideLabel(data.curve)
  return { device: parsed.device, curve: parsed.curve, ...extra }
}

export function defaultGuideCatheter(
  size: GuideCatheter['size'],
  right: boolean,
): GuideCatheter {
  return right
    ? { device: 'JR', curve: '4.0', size }
    : { device: 'EBU', curve: '3.5', size }
}
