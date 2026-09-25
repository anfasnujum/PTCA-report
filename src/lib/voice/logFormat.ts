import type { VoiceAction } from '@/lib/voice/schema'

function field(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(', ')
  return ''
}

export function formatVoiceAction(action: VoiceAction): string {
  const data = action.data
  const vessel = action.vessel || field(data, 'vessel')
  switch (action.op) {
    case 'add_event': {
      const kind = (action.kind ?? field(data, 'kind')) || 'event'
      const name = field(data, 'name')
      const size = [field(data, 'diameterMm'), field(data, 'lengthMm')].filter(Boolean).join('×')
      return ['Add', kind, name, size && `${size} mm`, vessel].filter(Boolean).join(' · ')
    }
    case 'update_event':
      return ['Edit', action.kind || 'event', action.eventId?.slice(0, 8), vessel].filter(Boolean).join(' · ')
    case 'remove_event':
      return `Remove event ${action.eventId?.slice(0, 8) ?? ''}`.trim()
    case 'add_inflation':
      return `Inflation ${field(data, 'atm') ? `${field(data, 'atm')} atm` : ''} ${vessel}`.trim()
    case 'upsert_finding': {
      const stenosis = field(data, 'stenosis')
      const segment = field(data, 'segment')
      return ['Finding', vessel, stenosis && `${stenosis}%`, segment].filter(Boolean).join(' · ')
    }
    case 'patch_access': {
      const bits = [field(data, 'side'), field(data, 'site'), field(data, 'sheathSize'), field(data, 'sheathBrand')].filter(Boolean)
      return `Access · ${bits.join(' ') || 'updated'}`
    }
    case 'patch_contrast': {
      const agent = field(data, 'agent') || field(data, 'contrast')
      const volume = field(data, 'volumeMl') || field(data, 'contrastVolumeMl')
      return `Contrast · ${[agent, volume && `${volume} mL`].filter(Boolean).join(' ')}`
    }
    case 'patch_patient':
      return `Patient · ${Object.keys(data ?? {}).join(', ') || 'updated'}`
    case 'patch_indication':
      return `Indication · ${field(data, 'chips') || 'updated'}`
    case 'patch_outcome':
      return 'Outcome updated'
    case 'patch_periprocedural':
      return `Meds / fluoro · ${Object.keys(data ?? {}).join(', ') || 'updated'}`
    case 'patch_closure':
      return 'Closure updated'
    case 'patch_lab':
      return `Lab · ${Object.keys(data ?? {}).join(', ') || 'updated'}`
    case 'patch_operators':
      return `Operators · ${[field(data, 'mainOperator'), field(data, 'assistantOperator')].filter(Boolean).join(', ') || 'updated'}`
    case 'set_notes':
      return 'Notes updated'
    case 'patch_cag':
      return 'CAG impression / advice updated'
    case 'set_vessel_pci_kind':
      return `${vessel || 'Vessel'} · ${field(data, 'kind') || 'PCI kind'}`
    default:
      return action.op
  }
}
