import { describe, expect, it } from 'vitest'
import { generateNote } from '@/lib/noteTemplate'
import { demoProcedure, emptyProcedure } from '@/lib/seed'
import type { Procedure, ProcedureEvent, StentUse } from '@/types/procedure'

function ev<K extends ProcedureEvent['kind']>(
  kind: K,
  data: Extract<ProcedureEvent, { kind: K }>['data'],
  id: string,
): Extract<ProcedureEvent, { kind: K }> {
  return { id, at: 1, kind, data } as Extract<ProcedureEvent, { kind: K }>
}

function base(over: Partial<Procedure> = {}): Procedure {
  const p = emptyProcedure('test')
  return {
    ...p,
    patient: {
      ...p.patient,
      name: 'Test',
      title: 'Mr',
      age: 60,
      sex: 'M',
      hospitalId: 'H1',
      date: '2026-09-11',
      startTime: '09:00',
    },
    operators: ['Dr. X'],
    ...over,
  }
}

describe('generateNote', () => {
  it('renders the demo STEMI primary PCI note as a sequential narrative', () => {
    const note = generateNote(demoProcedure())
    expect(note).toContain('PTCA & STENTING — PROCEDURE NOTE')
    expect(note).toContain('Patient: Mr. XXXX, 58/M')
    expect(note).toContain('Hospital No: 123456')
    expect(note).toContain('Date: 11/09/2026')
    expect(note).toContain('Time: 10:40 – 11:25')
    expect(note).toContain('Indication: Acute inferior wall STEMI — primary PCI')
    expect(note).toContain('Operators: Dr. A, Dr. B')
    expect(note).toContain('Right radial artery accessed in a single attempt; 6F sheath inserted.')
    expect(note).toContain('LMCA: normal.')
    expect(note).toContain('LAD: 40% stenosis in the mid segment, TIMI III flow.')
    expect(note).toContain('LCX: normal.')
    expect(note).toContain('RCA: 95% thrombotic stenosis in the proximal segment, TIMI I flow.')
    expect(note).toContain('Target vessel: proximal RCA.')
    expect(note).toContain(
      'The right coronary artery was engaged with a 6F JR4 guiding catheter.',
    )
    expect(note).toContain(
      'The lesion was crossed with a 0.014" BMW workhorse guidewire and parked in the distal RCA.',
    )
    expect(note).toContain(
      'Predilatation was performed at the proximal RCA with a Sapphire II semi-compliant balloon 2.0 × 15 mm at 10 atm for 20 seconds, followed by a second inflation at 12 atm for 15 seconds.',
    )
    expect(note).toContain(
      'A Supraflex Cruz drug-eluting stent 3.5 × 28 mm was deployed at the proximal RCA at 14 atm for 20 seconds.',
    )
    expect(note).toContain(
      'Post-dilatation was performed with an NC Sapphire non-compliant balloon 3.75 × 12 mm at 18 atm for 15 seconds.',
    )
    expect(note).toContain(
      'Good angiographic result with 0% residual stenosis and TIMI III flow distally.',
    )
    expect(note).toContain('No dissection, no side-branch compromise, no no-reflow.')
    expect(note).toContain('Heparin 7500 IU. Contrast: Iohexol 90 mL. Fluoroscopy time 6.2 min.')
    expect(note).toContain(
      'Sheath removed and haemostasis achieved with a TR band. Patient shifted to CCU in a stable condition.',
    )
    expect(note).toContain(
      'Not a medical device — documentation aid only. Verify all entries before signing.',
    )
    const procedureIdx = note.indexOf('PROCEDURE')
    const predilIdx = note.indexOf('Predilatation')
    const stentIdx = note.indexOf('Supraflex Cruz')
    const postIdx = note.indexOf('Post-dilatation')
    expect(procedureIdx).toBeGreaterThan(-1)
    expect(predilIdx).toBeGreaterThan(procedureIdx)
    expect(stentIdx).toBeGreaterThan(predilIdx)
    expect(postIdx).toBeGreaterThan(stentIdx)
  })

  it('covers multiple balloons as separate sequential events', () => {
    const note = generateNote(
      base({
        events: [
          ev(
            'predilatation',
            {
              name: 'Sapphire II',
              type: 'semi-compliant',
              diameterMm: 1.5,
              lengthMm: 15,
              vessel: 'LAD',
              segment: 'mid',
              inflations: [{ atm: 8, seconds: 20 }],
            },
            'b1',
          ),
          ev(
            'predilatation',
            {
              name: 'Emerge',
              type: 'semi-compliant',
              diameterMm: 2.5,
              lengthMm: 20,
              vessel: 'LAD',
              segment: 'mid',
              inflations: [
                { atm: 10, seconds: 20 },
                { atm: 12, seconds: 15 },
              ],
            },
            'b2',
          ),
        ],
      }),
    )
    expect(note).toContain('PTCA — PROCEDURE NOTE')
    expect(note).toContain('Sapphire II semi-compliant balloon 1.5 × 15 mm')
    expect(note).toContain('Emerge semi-compliant balloon 2.5 × 20 mm')
    expect(note).toContain('followed by a second inflation at 12 atm')
    expect(note.indexOf('Sapphire II')).toBeLessThan(note.indexOf('Emerge'))
  })

  it('covers multiple stents in chronological order', () => {
    const note = generateNote(
      base({
        events: [
          ev(
            'stent',
            {
              name: 'Xience Sierra',
              type: 'DES',
              diameterMm: 3.0,
              lengthMm: 28,
              vessel: 'LAD',
              segment: 'proximal',
              deployedAtAtm: 12,
              seconds: 20,
            },
            's1',
          ),
          ev(
            'stent',
            {
              name: 'Synergy',
              type: 'DES',
              diameterMm: 2.75,
              lengthMm: 16,
              vessel: 'LAD',
              segment: 'mid',
              deployedAtAtm: 14,
              seconds: 15,
            },
            's2',
          ),
        ],
      }),
    )
    expect(note).toContain('A Xience Sierra drug-eluting stent 3.0 × 28 mm')
    expect(note).toContain('A Synergy drug-eluting stent 2.75 × 16 mm')
    expect(note.indexOf('Xience Sierra')).toBeLessThan(note.indexOf('Synergy'))
  })

  it('mentions overlapping / tandem stents using overlapWithEventId', () => {
    const first: StentUse = {
      name: 'BioMime',
      type: 'DES',
      diameterMm: 3.0,
      lengthMm: 32,
      vessel: 'LAD',
      segment: 'proximal',
      deployedAtAtm: 12,
      seconds: 20,
    }
    const note = generateNote(
      base({
        events: [
          ev('stent', first, 's1'),
          ev(
            'stent',
            {
              name: 'BioMime',
              type: 'DES',
              diameterMm: 2.75,
              lengthMm: 16,
              vessel: 'LAD',
              segment: 'mid',
              deployedAtAtm: 14,
              seconds: 15,
              overlapWithEventId: 's1',
            },
            's2',
          ),
        ],
      }),
    )
    expect(note).toContain('overlapping the previously deployed 3.0 × 32 mm stent')
  })

  it('covers two-vessel PCI as a walk of the event list', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 90,
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
          {
            id: '2',
            vessel: 'RCA',
            segment: 'proximal',
            stenosis: 80,
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
        events: [
          ev('guideCatheter', { curve: 'EBU 3.5', size: '6F', coronary: 'left' }, 'g1'),
          ev('guidewire', { name: 'BMW', type: 'workhorse', vessel: 'LAD' }, 'w1'),
          ev(
            'stent',
            {
              name: 'Xience Sierra',
              type: 'DES',
              diameterMm: 3.0,
              lengthMm: 24,
              vessel: 'LAD',
              segment: 'mid',
              deployedAtAtm: 12,
              seconds: 20,
            },
            's1',
          ),
          ev('guideCatheter', { curve: 'JR4', size: '6F', coronary: 'right' }, 'g2'),
          ev('guidewire', { name: 'Runthrough NS', type: 'workhorse', vessel: 'RCA' }, 'w2'),
          ev(
            'stent',
            {
              name: 'Supraflex Cruz',
              type: 'DES',
              diameterMm: 3.5,
              lengthMm: 28,
              vessel: 'RCA',
              segment: 'proximal',
              deployedAtAtm: 14,
              seconds: 20,
            },
            's2',
          ),
        ],
      }),
    )
    expect(note).toContain('Target vessels: mid LAD and proximal RCA.')
    expect(note).toContain('The left coronary system was engaged with a 6F EBU 3.5 guiding catheter.')
    expect(note).toContain('The right coronary artery was engaged with a 6F JR4 guiding catheter.')
    expect(note.indexOf('EBU 3.5')).toBeLessThan(note.indexOf('JR4'))
    expect(note.indexOf('deployed at the mid LAD')).toBeLessThan(
      note.indexOf('deployed at the proximal RCA'),
    )
  })

  it('covers a no-stent (plain balloon) case', () => {
    const note = generateNote(
      base({
        events: [
          ev('guideCatheter', { curve: 'JR4', size: '6F', coronary: 'right' }, 'g'),
          ev('guidewire', { name: 'BMW', type: 'workhorse', vessel: 'RCA' }, 'w'),
          ev(
            'predilatation',
            {
              name: 'Agent',
              type: 'drug-coated',
              diameterMm: 3.0,
              lengthMm: 20,
              vessel: 'RCA',
              segment: 'mid',
              inflations: [{ atm: 10, seconds: 60 }],
              result: 'full expansion',
            },
            'b',
          ),
        ],
        outcome: {
          residualStenosis: 20,
          finalTimiFlow: 3,
          dissection: 'none',
          noReflow: false,
          slowFlow: false,
          sideBranchCompromise: false,
          complications: ['none'],
          comment: 'Stenting deferred.',
        },
      }),
    )
    expect(note.startsWith('PTCA — PROCEDURE NOTE')).toBe(true)
    expect(note).not.toContain('STENTING')
    expect(note).not.toContain('drug-eluting stent')
    expect(note).toContain('Agent drug-coated balloon 3.0 × 20 mm')
    expect(note).toContain('Full expansion.')
    expect(note).toContain('Stenting deferred.')
    expect(note).toContain('20% residual stenosis')
  })
})
