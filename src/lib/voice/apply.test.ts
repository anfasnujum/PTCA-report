import { describe, expect, it } from 'vitest'
import { applyVoiceActions } from '@/lib/voice/apply'
import { enrichVoiceDecision } from '@/lib/voice/facts'
import { parseVoiceDecision } from '@/lib/voice/schema'
import { jsonFromModelText } from '@/lib/voice/interpret'
import { resolveVessel } from '@/lib/voice/match'
import { demoProcedure, emptyProcedure } from '@/lib/seed'
import type { CatalogueItem } from '@/types/procedure'

const catalogue: CatalogueItem[] = [
  { id: 'c1', category: 'balloon', name: 'NC Trek', meta: {}, lastUsedAt: 1, useCount: 2 },
  { id: 'c2', category: 'stent', name: 'Supraflex Cruz', meta: {}, lastUsedAt: 1, useCount: 4 },
  { id: 'c3', category: 'balloon', name: 'Sapphire II', meta: {}, lastUsedAt: 1, useCount: 3 },
  { id: 'c4', category: 'balloon', name: 'Ryurei', meta: {}, lastUsedAt: 1, useCount: 2 },
  { id: 'c5', category: 'balloon', name: 'Accuforce', meta: {}, lastUsedAt: 1, useCount: 2 },
  { id: 'c6', category: 'wire', name: 'Runthrough NS', meta: {}, lastUsedAt: 1, useCount: 5 },
]

describe('resolveVessel', () => {
  it('maps spoken aliases', () => {
    expect(resolveVessel('left anterior descending')).toBe('LAD')
    expect(resolveVessel('diag')).toBe('D1')
    expect(resolveVessel('D1')).toBe('D1')
    expect(resolveVessel('rca')).toBe('RCA')
  })
})

describe('parseVoiceDecision', () => {
  it('promotes a single clarify option to apply', () => {
    const decision = parseVoiceDecision({
      status: 'clarify',
      options: [
        {
          label: 'NC balloon to LAD',
          actions: [{ op: 'add_event', kind: 'postdilatation', data: { name: 'NC Trek', vessel: 'LAD' } }],
        },
      ],
    })
    expect(decision.status).toBe('apply')
    if (decision.status === 'apply') expect(decision.actions).toHaveLength(1)
  })

  it('keeps competing options for the user', () => {
    const decision = parseVoiceDecision({
      status: 'clarify',
      question: 'Which vessel?',
      options: [
        { label: 'LAD', actions: [{ op: 'add_event', kind: 'stent', data: { vessel: 'LAD' } }] },
        { label: 'D1', actions: [{ op: 'add_event', kind: 'stent', data: { vessel: 'D1' } }] },
      ],
    })
    expect(decision.status).toBe('clarify')
    if (decision.status === 'clarify') expect(decision.options).toHaveLength(2)
  })
})

describe('jsonFromModelText', () => {
  it('parses fenced JSON', () => {
    expect(jsonFromModelText('```json\n{"status":"none","reason":"x"}\n```')).toEqual({
      status: 'none',
      reason: 'x',
    })
  })
})

describe('applyVoiceActions', () => {
  it('adds a balloon on the spoken vessel', () => {
    const next = applyVoiceActions(
      emptyProcedure('p1', 'ptca'),
      [
        {
          op: 'add_event',
          kind: 'predilatation',
          data: { name: 'sapphire', vessel: 'LAD', diameterMm: 2.5, lengthMm: 15 },
        },
      ],
      catalogue,
    )
    expect(next.events).toHaveLength(1)
    const event = next.events[0]
    expect(event.kind).toBe('predilatation')
    if (event.kind !== 'predilatation') throw new Error('expected balloon')
    expect(event.data.name).toBe('Sapphire II')
    expect(event.data.vessel).toBe('LAD')
    expect(event.data.diameterMm).toBe(2.5)
  })

  it('puts a spoken Runthrough on the wire row, not balloon or catheter', () => {
    const next = applyVoiceActions(
      emptyProcedure('p-wire', 'ptca'),
      [
        {
          op: 'add_event',
          kind: 'predilatation',
          data: { name: '0.01x15mm Runthrough NS floppy', diameterMm: 0.01, lengthMm: 15, vessel: 'RCA' },
        },
        { op: 'add_event', kind: 'guideCatheter', data: { name: '7F RUNTHROUGH 3.0', size: '7F' } },
      ],
      catalogue,
    )
    expect(next.events.map((e) => e.kind)).toEqual(['guidewire', 'guidewire'])
    const wire = next.events[0]
    if (wire.kind !== 'guidewire') throw new Error('expected wire')
    expect(wire.data.name).toBe('Runthrough NS')
  })

  it('stores balloon catalogue name and size separately', () => {
    const next = applyVoiceActions(
      emptyProcedure('p-bal', 'ptca'),
      [
        { op: 'add_event', kind: 'predilatation', data: { name: '2.0x10mm 2x10 mm Reuleat', vessel: 'RCA' } },
        { op: 'add_event', kind: 'predilatation', data: { name: '2.5x12 mm Accufose', vessel: 'RCA' } },
      ],
      catalogue,
    )
    const balloons = next.events.filter((e) => e.kind === 'predilatation')
    expect(balloons).toHaveLength(2)
    if (balloons[0]?.kind !== 'predilatation' || balloons[1]?.kind !== 'predilatation') throw new Error('expected balloons')
    expect(balloons[0].data.name).toBe('Ryurei')
    expect(balloons[0].data.diameterMm).toBe(2)
    expect(balloons[0].data.lengthMm).toBe(10)
    expect(balloons[1].data.name).toBe('Accuforce')
    expect(balloons[1].data.diameterMm).toBe(2.5)
    expect(balloons[1].data.lengthMm).toBe(12)
  })

  it('adds a stent using catalogue name and demo location', () => {
    const next = applyVoiceActions(
      demoProcedure(),
      [{ op: 'add_event', kind: 'stent', data: { name: 'supraflex', diameterMm: 3, lengthMm: 28, vessel: 'RCA' } }],
      catalogue,
    )
    const stents = next.events.filter((e) => e.kind === 'stent')
    expect(stents.length).toBeGreaterThan(1)
    const added = stents.at(-1)
    if (!added || added.kind !== 'stent') throw new Error('expected stent')
    expect(added.data.name).toBe('Supraflex Cruz')
    expect(added.data.vessel).toBe('RCA')
    expect(added.data.lengthMm).toBe(28)
  })

  it('updates an existing balloon and can append an inflation', () => {
    const start = demoProcedure()
    const balloon = start.events.find((e) => e.kind === 'predilatation')
    if (!balloon) throw new Error('demo balloon')
    const renamed = applyVoiceActions(
      start,
      [{ op: 'update_event', eventId: balloon.id, data: { name: 'NC Trek', diameterMm: 3 } }],
      catalogue,
    )
    const updated = renamed.events.find((e) => e.id === balloon.id)
    if (!updated || updated.kind !== 'predilatation') throw new Error('expected balloon')
    expect(updated.data.name).toBe('NC Trek')
    expect(updated.data.diameterMm).toBe(3)

    const inflated = applyVoiceActions(renamed, [{ op: 'add_inflation', eventId: balloon.id, data: { atm: 16 } }], catalogue)
    const again = inflated.events.find((e) => e.id === balloon.id)
    if (!again || again.kind !== 'predilatation') throw new Error('expected balloon')
    expect(again.data.inflations.at(-1)?.atm).toBe(16)
  })

  it('upserts a PCI lesion from spoken stenosis', () => {
    const next = applyVoiceActions(
      emptyProcedure('cag', 'cag'),
      [{ op: 'upsert_finding', vessel: 'LAD', data: { stenosis: 90, segment: 'proximal' } }],
      catalogue,
    )
    expect(next.baselineAngio[0]?.vessel).toBe('LAD')
    expect(next.baselineAngio[0]?.stenosis).toBe(90)
    expect(next.baselineAngio[0]?.segment).toBe('proximal')
    expect(next.baselineAngio[0]?.isTarget).toBe(true)
  })

  it('leaves lesion segment blank when it was not spoken', () => {
    const next = applyVoiceActions(
      emptyProcedure('cag', 'cag'),
      [
        { op: 'upsert_finding', vessel: 'LMCA', data: { stenosis: 80 } },
        { op: 'upsert_finding', vessel: 'LAD', data: { stenosis: 80 } },
        { op: 'upsert_finding', vessel: 'RCA', data: { stenosis: 90 } },
      ],
      catalogue,
    )
    expect(next.baselineAngio.map((f) => [f.vessel, f.stenosis, f.segment])).toEqual([
      ['LMCA', 80, undefined],
      ['LAD', 80, undefined],
      ['RCA', 90, undefined],
    ])
  })

  it('parses a percent string instead of falling back to 80', () => {
    const next = applyVoiceActions(
      emptyProcedure('cag', 'cag'),
      [{ op: 'upsert_finding', vessel: 'RCA', data: { stenosis: '50%', segment: 'proximal' } }],
      catalogue,
    )
    expect(next.baselineAngio[0]?.stenosis).toBe(50)
  })

  it('writes Access-page contrast from patch_contrast', () => {
    const next = applyVoiceActions(
      emptyProcedure('p2', 'cag'),
      [{ op: 'patch_contrast', data: { agent: 'Omnipaque', volumeMl: 100 } }],
      catalogue,
    )
    expect(next.lab.contrast).toBe('Omnipaque 100 mL')
    expect(next.periprocedural.contrastVolumeMl).toBe(100)
    expect(next.periprocedural.contrastAgent).toBe('Omnipaque')
  })

  it('maps Prelude onto the sheath brand chip', () => {
    const next = applyVoiceActions(
      emptyProcedure('p3', 'ptca'),
      [{ op: 'patch_access', data: { sheathSize: '6F', sheathBrand: 'Prelude' } }],
      catalogue,
    )
    expect(next.access.sheathSize).toBe('6F')
    expect(next.access.sheathBrand).toBe('Prelude Ease')
  })
})

describe('enrichVoiceDecision', () => {
  it('adds omitted Omnipaque volume from the transcript', () => {
    const decision = enrichVoiceDecision(
      'Right radial artery 4F sheath was used with 100 ml Omnipaque contrast',
      {
        status: 'apply',
        summary: 'Updated access site to right radial artery with 4F sheath.',
        actions: [{ op: 'patch_access', data: { site: 'radial', side: 'right', sheathSize: '4F' } }],
      },
    )
    expect(decision.status).toBe('apply')
    if (decision.status !== 'apply') throw new Error('expected apply')
    expect(decision.actions.some((a) => a.op === 'patch_contrast')).toBe(true)
    const contrast = decision.actions.find((a) => a.op === 'patch_contrast')
    expect(contrast?.data).toEqual({ agent: 'Omnipaque', volumeMl: 100 })
  })

  it('overwrites default 80% stenosis with the spoken percent', () => {
    const decision = enrichVoiceDecision('RCA 50 percent stenosis', {
      status: 'apply',
      summary: 'Added RCA lesion.',
      actions: [{ op: 'upsert_finding', vessel: 'RCA', data: { vessel: 'RCA', stenosis: 80 } }],
    })
    expect(decision.status).toBe('apply')
    if (decision.status !== 'apply') throw new Error('expected apply')
    expect(decision.actions[0]?.data?.stenosis).toBe(50)
    expect(decision.actions[0]?.data?.segment).toBeUndefined()
  })

  it('drops invented proximal when the transcript did not name a segment', () => {
    const decision = enrichVoiceDecision('LM 80 percent LAD 80 percent RCA 90 percent', {
      status: 'apply',
      summary: 'Added lesions.',
      actions: [
        { op: 'upsert_finding', vessel: 'LMCA', data: { stenosis: 80, segment: 'proximal' } },
        { op: 'upsert_finding', vessel: 'LAD', data: { stenosis: 80, segment: 'proximal' } },
        { op: 'upsert_finding', vessel: 'RCA', data: { stenosis: 90, segment: 'proximal' } },
      ],
    })
    expect(decision.status).toBe('apply')
    if (decision.status !== 'apply') throw new Error('expected apply')
    expect(decision.actions.map((a) => a.data?.stenosis)).toEqual([80, 80, 90])
    expect(decision.actions.every((a) => a.data?.segment == null)).toBe(true)
  })

  it('keeps proximal when the transcript named it', () => {
    const decision = enrichVoiceDecision('proximal LAD 80 percent', {
      status: 'apply',
      summary: 'Added LAD lesion.',
      actions: [{ op: 'upsert_finding', vessel: 'LAD', data: { stenosis: 80, segment: 'proximal' } }],
    })
    expect(decision.status).toBe('apply')
    if (decision.status !== 'apply') throw new Error('expected apply')
    expect(decision.actions[0]?.data?.segment).toBe('proximal')
  })

  it('applies 6F Prelude even when the model said nothing changed', () => {
    const decision = enrichVoiceDecision('6F sheath. The sheath used was 6F Prelude.', {
      status: 'none',
      reason: 'The transcript does not provide new information that requires changes to the structured report.',
    })
    expect(decision.status).toBe('apply')
    if (decision.status !== 'apply') throw new Error('expected apply')
    expect(decision.actions).toEqual([
      { op: 'patch_access', data: { sheathSize: '6F', sheathBrand: 'Prelude Ease' } },
    ])
  })
})
