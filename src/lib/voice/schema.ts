import type { EventKind } from '@/types/procedure'

export const VOICE_EVENT_KINDS: EventKind[] = [
  'guideCatheter',
  'thrombusAspiration',
  'microcatheter',
  'guidewire',
  'guideExtension',
  'predilatation',
  'stent',
  'postdilatation',
  'lmcaPot',
  'imaging',
  'adjunct',
  'note',
]

export type VoiceActionOp =
  | 'add_event'
  | 'update_event'
  | 'remove_event'
  | 'add_inflation'
  | 'upsert_finding'
  | 'patch_patient'
  | 'patch_indication'
  | 'patch_access'
  | 'patch_outcome'
  | 'patch_periprocedural'
  | 'patch_closure'
  | 'patch_lab'
  | 'patch_operators'
  | 'set_notes'
  | 'patch_cag'
  | 'patch_contrast'
  | 'set_vessel_pci_kind'

export type VoiceAction = {
  op: VoiceActionOp
  kind?: EventKind
  eventId?: string
  vessel?: string
  summary?: string
  data?: Record<string, unknown>
}

export type VoiceOption = {
  id: string
  label: string
  summary: string
  actions: VoiceAction[]
}

export type VoiceDecision =
  | { status: 'apply'; summary: string; actions: VoiceAction[] }
  | { status: 'clarify'; question: string; options: VoiceOption[] }
  | { status: 'none'; reason: string }

const ACTION_OPS = new Set<VoiceActionOp>([
  'add_event',
  'update_event',
  'remove_event',
  'add_inflation',
  'upsert_finding',
  'patch_patient',
  'patch_indication',
  'patch_access',
  'patch_outcome',
  'patch_periprocedural',
  'patch_closure',
  'patch_lab',
  'patch_operators',
  'set_notes',
  'patch_cag',
  'patch_contrast',
  'set_vessel_pci_kind',
])

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function parseActions(raw: unknown): VoiceAction[] {
  if (!Array.isArray(raw)) return []
  const out: VoiceAction[] = []
  for (const item of raw) {
    const rec = asRecord(item)
    if (!rec) continue
    const op = rec.op
    if (typeof op !== 'string' || !ACTION_OPS.has(op as VoiceActionOp)) continue
    const kind = typeof rec.kind === 'string' && VOICE_EVENT_KINDS.includes(rec.kind as EventKind)
      ? (rec.kind as EventKind)
      : undefined
    out.push({
      op: op as VoiceActionOp,
      kind,
      eventId: typeof rec.eventId === 'string' ? rec.eventId : undefined,
      vessel: typeof rec.vessel === 'string' ? rec.vessel : undefined,
      summary: typeof rec.summary === 'string' ? rec.summary : undefined,
      data: asRecord(rec.data),
    })
  }
  return out
}

function parseOptions(raw: unknown): VoiceOption[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, i) => {
    const rec = asRecord(item)
    if (!rec) return []
    const actions = parseActions(rec.actions)
    if (!actions.length) return []
    const label = typeof rec.label === 'string' && rec.label.trim() ? rec.label.trim() : `Option ${i + 1}`
    return [
      {
        id: typeof rec.id === 'string' && rec.id.trim() ? rec.id : `opt-${i + 1}`,
        label,
        summary: typeof rec.summary === 'string' && rec.summary.trim() ? rec.summary.trim() : label,
        actions,
      },
    ]
  })
}

export function parseVoiceDecision(payload: unknown): VoiceDecision {
  const rec = asRecord(payload)
  if (!rec) return { status: 'none', reason: 'The model returned an unreadable response.' }

  const status = rec.status
  if (status === 'clarify') {
    const options = parseOptions(rec.options)
    if (options.length === 1) {
      return { status: 'apply', summary: options[0].summary, actions: options[0].actions }
    }
    if (options.length >= 2) {
      return {
        status: 'clarify',
        question:
          typeof rec.question === 'string' && rec.question.trim()
            ? rec.question.trim()
            : 'Which of these did you mean?',
        options,
      }
    }
  }

  const actions = parseActions(rec.actions)
  if (status === 'apply' || actions.length) {
    if (!actions.length) return { status: 'none', reason: 'No documentation change was recognised.' }
    return {
      status: 'apply',
      summary:
        typeof rec.summary === 'string' && rec.summary.trim()
          ? rec.summary.trim()
          : 'Apply this change to the report.',
      actions,
    }
  }

  return {
    status: 'none',
    reason:
      typeof rec.reason === 'string' && rec.reason.trim()
        ? rec.reason.trim()
        : 'That did not sound like a report edit.',
  }
}
