import { normalizeContrastAgent } from '@/lib/access'
import { resolveSheathBrand, resolveSheathSize, resolveVessel } from '@/lib/voice/match'
import type { VoiceAction, VoiceDecision } from '@/lib/voice/schema'

const CONTRAST_BRANDS = [
  'omnipaque',
  'visipaque',
  'xenetix',
  'ultravist',
  'iomeron',
  'optiray',
  'iopamiro',
  'isovue',
  'glandvida',
  'iohexol',
  'iodixanol',
  'iopromide',
  'ioversol',
  'iomeprol',
  'iopamidol',
]

export function spokenContrast(transcript: string): { agent: string; volumeMl: number | '' } | null {
  const text = transcript.trim()
  if (!text) return null
  const brand = CONTRAST_BRANDS.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(text))
  if (!brand) return null
  const volume = text.match(/(\d+)\s*m(?:l|L)\b/i)
  return {
    agent: normalizeContrastAgent(brand),
    volumeMl: volume ? Number(volume[1]) : '',
  }
}

export function spokenStenosis(transcript: string): number | undefined {
  const text = transcript.trim()
  if (!text) return undefined
  const match =
    text.match(/(\d{1,3})\s*(?:%|percent|per\s*cent)\b/i) ??
    text.match(/\bstenosis\s*(?:of\s*)?(\d{1,3})\b/i)
  if (!match) return undefined
  const n = Number(match[1])
  if (!Number.isFinite(n) || n > 100) return undefined
  return n
}

const SEGMENT_MENTION =
  /\b(ostioproximal|ostio[ -]?proximal|proximal[ -]?mid|mid[ -]?distal|proximal|ostial|distal|mid)\b/i

export function transcriptMentionsSegment(transcript: string): boolean {
  return SEGMENT_MENTION.test(transcript)
}

export function spokenVessel(transcript: string): ReturnType<typeof resolveVessel> {
  const text = transcript.trim()
  if (!text) return undefined
  const direct = resolveVessel(text)
  if (direct) return direct
  const tokens = text.split(/[^A-Za-z0-9]+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const one = resolveVessel(tokens[i])
    if (one) return one
    if (i + 1 < tokens.length) {
      const two = resolveVessel(`${tokens[i]} ${tokens[i + 1]}`)
      if (two) return two
    }
  }
  return undefined
}

export function spokenSheath(transcript: string): { sheathSize?: string; sheathBrand?: string } | null {
  const text = transcript.trim()
  if (!text) return null
  const brand = resolveSheathBrand(text)
  const sheathMention = /\bsheath\b/i.test(text) || Boolean(brand)
  if (!sheathMention) return null
  const size = resolveSheathSize(text)
  if (!size && !brand) return null
  return {
    ...(size ? { sheathSize: size } : {}),
    ...(brand ? { sheathBrand: brand } : {}),
  }
}

function coversContrast(action: VoiceAction): boolean {
  if (action.op === 'patch_contrast') return true
  if (action.op === 'patch_lab' && typeof action.data?.contrast === 'string' && action.data.contrast.trim()) {
    return true
  }
  if (action.op === 'patch_periprocedural') {
    return action.data?.contrastAgent != null || action.data?.contrastVolumeMl != null
  }
  return false
}

function appendSummary(summary: string, bit: string): string {
  if (!bit) return summary
  if (!summary.trim()) return bit
  return `${summary.replace(/\.$/, '')}; ${bit}.`.replace(/\.\.$/, '.')
}

function mergeAccessPatch(actions: VoiceAction[], patch: Record<string, unknown>): VoiceAction[] {
  const index = actions.findIndex((action) => action.op === 'patch_access')
  if (index < 0) return [...actions, { op: 'patch_access', data: patch }]
  return actions.map((action, i) =>
    i === index ? { ...action, data: { ...action.data, ...patch } } : action,
  )
}

export function enrichVoiceDecision(transcript: string, decision: VoiceDecision): VoiceDecision {
  if (decision.status === 'clarify') return decision
  let actions = decision.status === 'apply' ? [...decision.actions] : []
  let summary = decision.status === 'apply' ? decision.summary : ''

  const contrast = spokenContrast(transcript)
  if (contrast && !actions.some(coversContrast)) {
    const volumeBit = contrast.volumeMl === '' ? contrast.agent : `${contrast.agent} ${contrast.volumeMl} mL`
    summary = appendSummary(summary, `contrast ${volumeBit}`)
    actions = [...actions, { op: 'patch_contrast', data: { ...contrast } }]
  }

  const sheath = spokenSheath(transcript)
  if (sheath) {
    actions = mergeAccessPatch(actions, sheath)
    summary = appendSummary(
      summary,
      [sheath.sheathSize, sheath.sheathBrand, 'sheath'].filter(Boolean).join(' '),
    )
  }

  const stenosis = spokenStenosis(transcript)
  if (stenosis != null) {
    const findings = actions.filter((action) => action.op === 'upsert_finding')
    if (findings.length === 1) {
      actions = actions.map((action) =>
        action.op === 'upsert_finding'
          ? { ...action, data: { ...action.data, stenosis } }
          : action,
      )
      summary = appendSummary(summary, `stenosis ${stenosis}%`)
    } else if (!findings.length) {
      const vessel = spokenVessel(transcript)
      if (vessel) {
        actions = [...actions, { op: 'upsert_finding', vessel, data: { stenosis, vessel } }]
        summary = appendSummary(summary, `${vessel} stenosis ${stenosis}%`)
      }
    }
  }

  if (!transcriptMentionsSegment(transcript)) {
    actions = actions.map((action) => {
      if (action.op !== 'upsert_finding' || action.data?.segment == null) return action
      const { segment: _segment, ...rest } = action.data
      return { ...action, data: rest }
    })
  }

  if (!actions.length) {
    return decision.status === 'none' ? decision : { status: 'none', reason: 'No documentation change was recognised.' }
  }
  return {
    status: 'apply',
    summary: summary.trim() || 'Updated the report from the transcript.',
    actions,
  }
}
