import { LLM_CHAT_PATH, loadLlmSettings } from '@/lib/llmSettings'
import { enrichVoiceDecision } from '@/lib/voice/facts'
import { parseVoiceDecision, type VoiceDecision } from '@/lib/voice/schema'
import { buildVoiceSnapshot } from '@/lib/voice/snapshot'
import type { CatalogueItem, Procedure } from '@/types/procedure'

export const VOICE_SYSTEM_PROMPT = `You are CathNote's documentation interpreter for live cath-lab reports (PTCA, CAG, and future procedure kinds).
Given a spoken transcript and a JSON snapshot of the current case, decide how to edit the structured report.

Return JSON only, matching:
{
  "status": "apply" | "clarify" | "none",
  "summary": "short confirmation of what will change (apply)",
  "reason": "why nothing applies (none)",
  "question": "what the user must choose (clarify)",
  "actions": [ { "op": "...", "kind": "...", "eventId": "...", "vessel": "...", "data": {} } ],
  "options": [ { "id": "a", "label": "short choice", "summary": "what this does", "actions": [] } ]
}

Action ops:
add_event, update_event, remove_event, add_inflation, upsert_finding,
patch_patient, patch_indication, patch_access, patch_outcome, patch_periprocedural,
patch_closure, patch_lab, patch_operators, set_notes, patch_cag, patch_contrast, set_vessel_pci_kind.

Field map (do not put contrast on access):
- Access site/side/sheath → patch_access { site: "radial"|"distal radial"|"ulnar"|"femoral"|"brachial", side: "right"|"left", sheathSize: "6F", sheathBrand: "Prelude Ease" }. Sheath brand is access.sheathBrand, not a catheter and not contrast. "Prelude" is Prelude Ease. "Avanti" is Avanti+. Always emit patch_access when a French size or brand is spoken, even if the snapshot already has the same size.
- Contrast agent and volume belong on the Access page as lab.contrast. Always use patch_contrast { agent: "Omnipaque", volumeMl: 100 }. Iohexol is Omnipaque. This is not a sheath and not access.site.
- Diagnostic catheters (TIG, JL) on CAG → patch_lab { catheter: "5F TIG" }. Guiding catheters on PTCA (JR, EBU, XB) → add_event kind guideCatheter { size, device, curve }. Never put a wire or balloon on Catheter.
- Guidewires (Runthrough, BMW, Sion, floppy) → add_event kind guidewire. Never treat a wire as a balloon or guiding catheter.
- Balloons → add_event kind predilatation (or postdilatation if they said NC/post). data.name is the catalogue name only (Ryurei, Accuforce, Sapphire II). Put size in diameterMm and lengthMm, not in the name. Do not invent 10 atm, 15 mm, or a French size unless spoken.
- Match names to the snapshot catalogue. Spoken "Reuleat" is Ryurei. "Accufose" is Accuforce. If two catalogue names fit equally, clarify.
- Do not use set_notes for hardware. Hardware always becomes timeline events / access chips so the report writer can format them.
- Lesion stenosis → upsert_finding { vessel: "RCA", data: { stenosis: 50 } }. data.stenosis must be the spoken percent 0-100. Never substitute 80 or any default when a percent was spoken. "50 percent" is 50, not 80.
- Put data.segment (proximal, mid, distal, ostial, …) only if the transcript named that segment. If the speaker only said the vessel and percent, omit segment. Never invent proximal.

Rules:
- Prefer status "apply" when one interpretation is clearly correct. Then fill "actions" and "summary".
- One utterance may contain several facts. Emit one action per fact. Never drop a spoken volume, agent, sheath size, stenosis percent, or vessel.
- Use "clarify" ONLY when two or more interpretations are similarly plausible (which vessel, which existing event to edit, predil vs postdil, which catalogue device). Give 2-4 options, each with its own actions. Do not apply until the user picks.
- Use "none" if this is not a documentation command. A spoken sheath size or brand is a documentation command.
- Never invent event ids. When editing, copy ids from the snapshot.
- For a new balloon or stent, set kind and data.name / diameterMm / lengthMm / vessel / segment when spoken. Omit unknown fields.
- NC / post-dilatation balloons are kind postdilatation. POT is lmcaPot. Plain balloons are predilatation unless the user said post.
- If the vessel is unspoken and the snapshot has a single target vessel or a clear last location, use that. If two target vessels fit equally, clarify.
- Match device names to catalogue entries when they are close. If two catalogue names fit equally, clarify.
- CAG cases still accept findings, access, impressions (patch_cag.impressions as ids), and advice.
- Do not write clinical advice. Only map speech onto the report fields.`

function detailMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const err = payload as { error?: { message?: string }; message?: string }
  if (typeof err.error?.message === 'string' && err.error.message.trim()) return err.error.message
  if (typeof err.message === 'string' && err.message.trim()) return err.message
  return null
}

function contentFromResponse(payload: unknown): string {
  if (!payload || typeof payload !== 'object') throw new Error('Unexpected LLM response.')
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message
    ?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('The model returned an empty interpretation.')
  }
  return content.trim()
}

export function jsonFromModelText(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed)
  const body = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(body) as unknown
}

export async function interpretTranscript(input: {
  transcript: string
  procedure: Procedure
  catalogue: CatalogueItem[]
  apiKey?: string
  model?: string
}): Promise<VoiceDecision> {
  const settings = loadLlmSettings()
  const apiKey = (input.apiKey ?? settings.apiKey).trim()
  const model = (input.model ?? settings.model).trim()
  if (!apiKey) throw new Error('Add an OpenAI API key in Settings to interpret voice edits.')

  const snapshot = buildVoiceSnapshot(input.procedure, input.catalogue)
  const response = await fetch(LLM_CHAT_PATH, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VOICE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({ transcript: input.transcript, case: snapshot }),
        },
      ],
    }),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(detailMessage(payload) || `Interpretation failed (${response.status}).`)
  }
  try {
    const decision = enrichVoiceDecision(
      input.transcript,
      parseVoiceDecision(jsonFromModelText(contentFromResponse(payload))),
    )
    return decision
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('The model returned invalid JSON.')
    throw err
  }
}
