import { describe, expect, it } from 'vitest'
import { generateNote, mainVesselLabel, mainVesselParagraph } from '@/lib/noteTemplate'
import { cagReportHeading } from '@/lib/format'
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

describe('cagReportHeading', () => {
  it('keeps the CAG title unless Primary CAG is selected', () => {
    expect(cagReportHeading()).toBe('CORONARY ANGIOGRAPHY REPORT')
    expect(cagReportHeading({ cagProcedure: 'cag' })).toBe('CORONARY ANGIOGRAPHY REPORT')
    expect(cagReportHeading({ cagProcedure: 'primary-cag' })).toBe(
      'PRIMARY CORONARY ANGIOGRAPHY REPORT',
    )
  })
})

describe('generateNote', () => {
  it('renders the demo STEMI note as a sequential narrative', () => {
    const note = generateNote(demoProcedure())
    expect(note).toContain('PTCA & STENTING — PROCEDURE NOTE')
    expect(note).toContain('Patient: Mr. XXXX, 58/M')
    expect(note).toContain('Cath No: 123456')
    expect(note).toContain('Date: 11/09/2026')
    expect(note).toContain('Time: 10:40 – 11:25')
    expect(note).toContain('Indication: Acute inferior wall STEMI — primary PCI')
    expect(note).toContain('Symptoms: Chest Pain, Dyspnea')
    expect(note).toContain('Operators: Dr. A (main), Dr. B (assistant)')
    expect(note).toContain('Right radial artery; 6F sheath inserted.')
    expect(note).toContain('Right dominant coronary circulation.')
    expect(note).toContain('LMCA: Normal.')
    expect(note).toContain('LAD: Mid LAD shows 40% stenosis. TIMI III flow.')
    expect(note).toContain('LCX: Normal.')
    expect(note).toContain('RCA: Proximal RCA shows 95% thrombotic stenosis. TIMI I flow.')
    expect(note).toContain('Target vessel: proximal RCA.')
    expect(note).toContain(
      [
        'Right dominant coronary circulation.',
        'LMCA: Normal.',
        'LAD: Mid LAD shows 40% stenosis. TIMI III flow.',
        'LCX: Normal.',
        'RCA: Proximal RCA shows 95% thrombotic stenosis. TIMI I flow.',
        'Target vessel: proximal RCA.',
      ].join('\n'),
    )
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

  it('names coronary dominance in the angiogram section', () => {
    expect(generateNote(base({ dominance: 'Left' }))).toContain(
      'Left dominant coronary circulation.',
    )
    expect(generateNote(base({ dominance: 'Codominant' }))).toContain(
      'Codominant coronary circulation.',
    )
    expect(generateNote(base({ dominance: 'Super-dominant right' }))).toContain(
      'Super-dominant right coronary circulation.',
    )
  })

  it('names proximal-mid and mid-distal segments', () => {
    const mid = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'proximal-mid',
            stenosis: 80,
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(mid).toContain('LAD: Proximal-mid LAD shows 80% stenosis. TIMI III flow.')
    expect(mid).toContain('Target vessel: proximal-mid LAD.')

    const distal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'mid-distal',
            stenosis: 70,
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(distal).toContain('RCA: Mid-distal RCA shows 70% stenosis.')
  })

  it('joins multiple selected segments with an ampersand', () => {
    const two = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: ['ostial', 'mid'],
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(two).toContain('LAD: Ostial & mid LAD shows 80% stenosis.')
    expect(two).toContain('Target vessel: ostial & mid LAD.')

    const three = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: ['ostial', 'mid', 'proximal'],
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(three).toContain('LCX: Ostial, proximal & mid LCX shows 70% stenosis.')
  })

  it('appends distal segment notes in the angiogram sentence', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            segment: 'distal',
            stenosis: 70,
            timiFlow: 3,
            features: [],
            isTarget: true,
            distalNote: 'Involving LAD ostium',
          },
        ],
      }),
    )
    expect(note).toContain(
      'Distal LMCA shows 70% stenosis, involving LAD ostium. TIMI III flow.',
    )

    const other = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'distal',
            stenosis: 80,
            timiFlow: 3,
            features: [],
            isTarget: false,
            distalNote: 'Other',
            distalNoteCustom: 'wrapping around the apex',
          },
        ],
      }),
    )
    expect(other).toContain(
      'LAD: Distal LAD shows 80% stenosis, wrapping around the apex. TIMI III flow.',
    )

    const hidden = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            timiFlow: 3,
            features: [],
            isTarget: false,
            distalNote: 'Involving LAD ostium',
          },
        ],
      }),
    )
    expect(hidden).not.toContain('involving LAD ostium')
  })

  it('appends RCA distal notes for PDA and PLV involvement', () => {
    const bifurcation = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'distal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            distalNote: 'Involving the bifurcation of PDA and PLV',
          },
        ],
      }),
    )
    expect(bifurcation).toContain(
      'RCA: Distal RCA shows 80% stenosis, involving the bifurcation of PDA and PLV.',
    )

    const pda = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'distal',
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            distalNote: 'Involving PDA ostium',
          },
        ],
      }),
    )
    expect(pda).toContain('RCA: Distal RCA shows 70% stenosis, involving PDA ostium.')

    const plv = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'distal',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            distalNote: 'Involving PLV ostium',
          },
        ],
      }),
    )
    expect(plv).toContain('RCA: Distal RCA shows 90% stenosis, involving PLV ostium.')

    const other = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'distal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            distalNote: 'Other',
            distalNoteCustom: 'involving a small RV branch',
          },
        ],
      }),
    )
    expect(other).toContain('RCA: Distal RCA shows 80% stenosis, involving a small RV branch.')
  })

  it('omits notes for Ramus on every segment', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'ri',
            vessel: 'Ramus',
            segment: 'distal',
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            distalNote: 'Involving LAD ostium',
            distalNoteCustom: 'wrapping around the apex',
          },
        ],
      }),
    )
    expect(note).toContain('Ramus: Distal Ramus shows 70% stenosis.')
    expect(note).not.toContain('involving LAD ostium')
    expect(note).not.toContain('wrapping around the apex')
  })

  it('appends LAD branch notes for ostioproximal through mid segments', () => {
    const bifurcation = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'D1',
            ladInvolvement: 'bifurcation',
          },
        ],
      }),
    )
    expect(bifurcation).toContain(
      'LAD: Mid LAD shows 80% stenosis, involving the bifurcation of D1.',
    )

    const ostium = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 70,
            findingType: 'lesion',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'D2',
            ladInvolvement: 'ostium',
          },
        ],
      }),
    )
    expect(ostium).toContain('LAD: Proximal LAD shows 70% lesion, involving D2 ostium.')

    const major = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'proximal-mid',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'major diagonal',
            ladInvolvement: 'ostium',
          },
        ],
      }),
    )
    expect(major).toContain(
      'LAD: Proximal-mid LAD shows mild plaques, involving major diagonal ostium.',
    )

    const ostioproximal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'ostioproximal',
            stenosis: 90,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'D1',
            ladInvolvement: 'bifurcation',
          },
        ],
      }),
    )
    expect(ostioproximal).toContain(
      'LAD: Ostioproximal LAD shows 90% stenosis, involving the bifurcation of D1.',
    )

    const incomplete = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'D1',
          },
        ],
      }),
    )
    expect(incomplete).not.toContain('involving')

    const notOnDistal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'distal',
            stenosis: 80,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'D1',
            ladInvolvement: 'bifurcation',
          },
        ],
      }),
    )
    expect(notOnDistal).not.toContain('involving the bifurcation of D1')

    const notOnLcx = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'mid',
            stenosis: 80,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladBranch: 'D1',
            ladInvolvement: 'ostium',
          },
        ],
      }),
    )
    expect(notOnLcx).not.toContain('involving D1 ostium')
  })

  it('appends LCX branch notes on every selected segment', () => {
    const proximal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'proximal',
            stenosis: 80,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxBranch: 'OM1',
            lcxInvolvement: 'bifurcation',
          },
        ],
      }),
    )
    expect(proximal).toContain(
      'LCX: Proximal LCX shows 80% stenosis, involving the bifurcation of OM1.',
    )

    const ostial = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'ostial',
            stenosis: 70,
            findingType: 'lesion',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxBranch: 'OM2',
            lcxInvolvement: 'ostium',
          },
        ],
      }),
    )
    expect(ostial).toContain('LCX: Ostial LCX shows 70% lesion, involving OM2 ostium.')

    const distal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'distal',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxBranch: 'major OM',
            lcxInvolvement: 'ostium',
          },
        ],
      }),
    )
    expect(distal).toContain('LCX: Distal LCX shows mild plaques, involving major OM ostium.')
  })

  it('writes stenosis as a range when range mode is selected', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 70,
            stenosisMode: 'range',
            stenosisRange: 20,
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Mid LAD shows 70–90% stenosis. TIMI III flow.')
  })

  it('names ostioproximal LMCA in the angiogram sentence', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            segment: 'ostioproximal',
            stenosis: 50,
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('Ostioproximal LMCA shows 50% stenosis.')
  })

  it('puts LMCA length before a disease description', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            segment: 'distal',
            stenosis: 70,
            findingType: 'lesion',
            stenosisMode: 'range',
            stenosisRange: 10,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lengthMode: 'category',
            lengthCategory: 'short',
            distalNote: 'Involving LAD ostium',
          },
        ],
      }),
    )
    expect(note).toContain('LMCA: Short.\nDistal LMCA shows 70–80% lesion, involving LAD ostium.')
  })

  it('writes LMCA length as a first sentence and the segment finding as a second', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 'none',
            features: ['calcified'],
            isTarget: false,
            lengthMode: 'category',
            lengthCategory: 'long',
            segment: 'ostioproximal',
          },
        ],
      }),
    )
    expect(note).toContain(
      'LMCA: Long.\nOstioproximal LMCA shows calcified, mild plaques.',
    )
  })

  it('writes LAD wrap type as a first sentence, then the segment finding', () => {
    const normal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'I',
            segment: 'mid',
          },
        ],
      }),
    )
    expect(normal).toContain('LAD: Type I Vessel and Normal.')
    expect(normal).not.toContain('LAD: Mid: Normal.')

    const stenosis = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'I',
          },
        ],
      }),
    )
    expect(stenosis).toContain('LAD: Type I Vessel. Mid LAD shows 80% stenosis.')

    const typeIii = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 3,
            features: [],
            isTarget: false,
            ladType: 'III',
          },
        ],
      }),
    )
    expect(typeIii).toContain('LAD: Type III Vessel. Proximal LAD shows mild plaques. TIMI III flow.')
  })

  it('appends an LAD type remark to the first sentence, before the finding', () => {
    const stenosis = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'I',
            ladRemarkOpen: true,
            ladRemark: 'wrapping around the apex',
          },
        ],
      }),
    )
    expect(stenosis).toContain(
      'LAD: Type I wrapping around the apex Vessel. Mid LAD shows 80% stenosis.',
    )

    const normal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'II',
            ladRemarkOpen: true,
            ladRemark: 'wrapping around the apex',
          },
        ],
      }),
    )
    expect(normal).toContain('LAD: Type II wrapping around the apex Vessel and Normal.')

    const other = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'other',
            segmentOther: 'gives a small vessel to the apex',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'I',
            ladRemarkOpen: true,
            ladRemark: 'wrapping around the apex',
          },
        ],
      }),
    )
    expect(other).toContain(
      'LAD: Type I wrapping around the apex Vessel. Gives a small vessel to the apex.',
    )

    const ectatic = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'I',
            ladRemarkOpen: true,
            ladRemark: 'ectatic',
          },
        ],
      }),
    )
    expect(ectatic).toContain('LAD: Type I ectatic Vessel. Mid LAD shows 80% stenosis.')
  })

  it('uses LAD other-segment text as the second sentence and ignores the hidden findings', () => {
    const withType = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'other',
            segmentOther: 'gives a small vessel to the apex',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 3,
            features: ['calcific'],
            isTarget: false,
            ladType: 'I',
          },
        ],
      }),
    )
    expect(withType).toContain('LAD: Type I Vessel. Gives a small vessel to the apex.')
    expect(withType).not.toContain('80% stenosis')
    expect(withType).not.toContain('calcific')
    expect(withType).not.toMatch(/LAD: Type I Vessel\..*TIMI/)

    const withoutType = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'other',
            segmentOther: 'wraps around the apex.',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(withoutType).toContain('LAD: Wraps around the apex.')
    expect(withoutType).not.toContain('LAD: Normal.')
    expect(withoutType).not.toContain('80% stenosis')
  })

  it('defaults stenosis range to 10 when range mode has no span set', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 70,
            stenosisMode: 'range',
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Mid LAD shows 70–80% stenosis. TIMI III flow.')
  })

  it('names plaque grade instead of a percent stenosis', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            segment: 'distal',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'minor',
            timiFlow: 3,
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('Distal LMCA shows minor plaques. TIMI III flow.')
  })

  it('uses a custom plaque percent when Other is selected', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            segment: 'ostioproximal',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'other',
            plaqueOther: '30',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('Ostioproximal LMCA shows 30% plaques.')
  })

  it('names myocardial bridging grade instead of a percent stenosis', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 0,
            findingType: 'myocardial-bridging',
            bridgingGrade: 'mild',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Mid LAD shows mild myocardial bridging.')
    expect(note).not.toContain('Mid LAD shows 0%')
  })

  it('lists selected features before myocardial bridging', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 0,
            findingType: 'myocardial-bridging',
            bridgingGrade: 'severe',
            timiFlow: 3,
            features: ['discrete'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Mid LAD shows discrete, severe myocardial bridging. TIMI III flow.')
  })

  it('lists selected features after the percent for stenosis or lesion', () => {
    const plaque = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 'none',
            features: ['discrete', 'calcific', 'ulcerated'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(plaque).toContain('LAD: Mid LAD shows discrete, calcific, ulcerated, mild plaques.')

    const stenosis = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'proximal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: ['tubular', 'hazy', 'irregular'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(stenosis).toContain('RCA: Proximal RCA shows 80% tubular, hazy, irregular stenosis.')

    const lesion = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'mid-distal',
            stenosis: 70,
            findingType: 'lesion',
            stenosisMode: 'range',
            stenosisRange: 10,
            timiFlow: 'none',
            features: ['diffuse', 'calcified'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(lesion).toContain('LCX: Mid-distal LCX shows 70–80% diffuse, calcified lesion.')

    const selectedOrder = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: ['ulcerated', 'discrete', 'calcific'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(selectedOrder).toContain('LAD: Mid LAD shows 80% ulcerated, discrete, calcific stenosis.')
  })

  it('appends slow flow features after stenosis or lesion', () => {
    const distal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: ['ulcerated', 'slow-flow-distal'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(distal).toContain('LAD: Proximal LAD shows 80% ulcerated stenosis with slow flow distally.')

    const flow = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'mid',
            stenosis: 70,
            findingType: 'lesion',
            timiFlow: 'none',
            features: ['slow-flow'],
            isTarget: false,
          },
        ],
      }),
    )
    expect(flow).toContain('RCA: Mid RCA shows 70% lesion with slow flow.')
  })

  it('writes LCX dominance as the first clause, then the segment finding', () => {
    const normal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxDominance: 'dominant',
            segment: 'mid',
          },
        ],
      }),
    )
    expect(normal).toContain('LCX: Dominant vessel and Normal.')
    expect(normal).not.toContain('LCX: Mid: Normal.')

    const disease = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'proximal',
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxDominance: 'non-dominant',
          },
        ],
      }),
    )
    expect(disease).toContain('LCX: Non dominant vessel. Proximal LCX shows 70% stenosis.')

    const co = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxDominance: 'co-dominant',
          },
        ],
      }),
    )
    expect(co).toContain('LCX: Co-dominant vessel. Mid LCX shows 40% stenosis.')
  })

  it('keeps the LCX heading and writes Parent LCX in the finding when Parent is yes', () => {
    const findings = [
      {
        id: '1',
        vessel: 'LCX' as const,
        segment: 'proximal' as const,
        stenosis: 70,
        findingType: 'stenosis' as const,
        timiFlow: 'none' as const,
        features: [] as string[],
        isTarget: true,
        lcxParent: true,
        lcxDominance: 'non-dominant' as const,
      },
    ]
    const note = generateNote(base({ baselineAngio: findings }))
    expect(note).toContain('LCX: Non dominant vessel. Proximal Parent LCX shows 70% stenosis.')
    expect(note).toContain('Target vessel: proximal Parent LCX.')
    expect(note).not.toContain('Parent LCX:')
    expect(mainVesselParagraph(findings, 'LCX')).toBe(
      'Non dominant vessel. Proximal Parent LCX shows 70% stenosis.',
    )
    expect(mainVesselLabel(findings, 'LCX')).toBe('LCX')
  })

  it('writes Parent LCX is normal when Parent is yes and the vessel is normal', () => {
    const findings = [
      {
        id: '1',
        vessel: 'LCX' as const,
        stenosis: 0,
        findingType: 'normal' as const,
        timiFlow: 'none' as const,
        features: [] as string[],
        isTarget: false,
        lcxParent: true,
        lcxDominance: 'dominant' as const,
      },
    ]
    const note = generateNote(base({ baselineAngio: findings }))
    expect(note).toContain('LCX: Dominant vessel. Parent LCX is normal.')
    expect(note).not.toContain('Parent LCX:')
    expect(mainVesselParagraph(findings, 'LCX')).toBe('Dominant vessel. Parent LCX is normal.')
  })

  it('writes Parent LCX in plaque findings when Parent is yes', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'mid',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lcxParent: true,
          },
        ],
      }),
    )
    expect(note).toContain('LCX: Mid Parent LCX shows mild plaques.')
    expect(note).not.toContain('Parent LCX:')
  })

  it('keeps LCX when Parent is no', () => {
    const findings = [
      {
        id: '1',
        vessel: 'LCX' as const,
        segment: 'mid' as const,
        stenosis: 40,
        findingType: 'stenosis' as const,
        timiFlow: 'none' as const,
        features: [] as string[],
        isTarget: false,
        lcxParent: false,
      },
    ]
    const note = generateNote(base({ baselineAngio: findings }))
    expect(note).toContain('LCX: Mid LCX shows 40% stenosis.')
    expect(note).not.toContain('Parent LCX')
    expect(mainVesselLabel(findings, 'LCX')).toBe('LCX')
  })

  it('writes RCA dominance as the first clause, then the segment finding', () => {
    const normal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            rcaDominance: 'dominant',
            segment: 'mid',
          },
        ],
      }),
    )
    expect(normal).toContain('RCA: Dominant vessel and Normal.')
    expect(normal).not.toContain('RCA: Mid: Normal.')

    const disease = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'proximal',
            stenosis: 95,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: ['thrombotic'],
            isTarget: false,
            rcaDominance: 'non-dominant',
          },
        ],
      }),
    )
    expect(disease).toContain('RCA: Non dominant vessel. Proximal RCA shows 95% thrombotic stenosis.')

    const co = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            rcaDominance: 'co-dominant',
          },
        ],
      }),
    )
    expect(co).toContain('RCA: Co-dominant vessel. Mid RCA shows 40% stenosis.')
  })

  it('appends an RCA dominance remark to the first sentence, before the finding', () => {
    const stenosis = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'proximal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            rcaDominance: 'dominant',
            rcaRemarkOpen: true,
            rcaRemark: 'gives PLV and PDA',
          },
        ],
      }),
    )
    expect(stenosis).toContain(
      'RCA: Dominant vessel, gives PLV and PDA. Proximal RCA shows 80% stenosis.',
    )

    const normal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            rcaDominance: 'dominant',
            rcaRemarkOpen: true,
            rcaRemark: 'gives PLV and PDA',
          },
        ],
      }),
    )
    expect(normal).toContain('RCA: Dominant vessel, gives PLV and PDA and Normal.')
  })

  it('writes Ramus size as the first clause, then the segment finding', () => {
    const normal = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'Ramus',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'good',
            segment: 'mid',
          },
        ],
      }),
    )
    expect(normal).toContain('Ramus: Good sized vessel and Normal.')
    expect(normal).not.toContain('Ramus: Mid: Normal.')

    const medium = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'Ramus',
            segment: 'proximal',
            stenosis: 30,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'medium',
          },
        ],
      }),
    )
    expect(medium).toContain('Ramus: Medium sized vessel and Proximal shows 30% stenosis.')

    const small = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'Ramus',
            segment: 'distal',
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'small',
          },
        ],
      }),
    )
    expect(small).toContain('Ramus: Small sized vessels and Distal shows 70% stenosis.')
  })

  it('writes D1, OM, PDA and PLV size as the first clause, like Ramus', () => {
    const d1 = generateNote(
      base({
        baselineAngio: [
          {
            id: 'd1',
            vessel: 'D1',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'good',
            segment: 'mid',
          },
        ],
      }),
    )
    expect(d1).toContain('LAD: Normal. D1: Good sized vessel and Normal.')
    expect(d1).not.toContain('D1: Mid: Normal.')
    expect(d1).not.toMatch(/\nD1:/)

    const d1Disease = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'd1',
            vessel: 'D1',
            segment: 'ostial',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'medium',
          },
        ],
      }),
    )
    expect(d1Disease).toContain(
      'LAD: Mid LAD shows 40% stenosis. D1: Medium sized vessel and Ostial shows 90% stenosis.',
    )
    expect(d1Disease).not.toContain('Ostial D1 shows')

    const d1NoSegment = generateNote(
      base({
        baselineAngio: [
          {
            id: 'd1',
            vessel: 'D1',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'medium',
          },
        ],
      }),
    )
    expect(d1NoSegment).toContain('D1: Medium sized vessel and shows 80% stenosis.')
    expect(d1NoSegment).not.toContain('and D1 shows')

    const om1 = generateNote(
      base({
        baselineAngio: [
          {
            id: 'om1',
            vessel: 'OM1',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            omMajor: true,
            ramusSize: 'good',
          },
        ],
      }),
    )
    expect(om1).toContain('LCX: Normal. OM1 - Major OM: Good sized vessel and Mid shows 80% stenosis.')
    expect(om1).not.toContain('Mid OM1 - Major OM shows')
    expect(om1).not.toMatch(/\nOM1/)

    const om1Plaque = generateNote(
      base({
        baselineAngio: [
          {
            id: 'om1',
            vessel: 'OM1',
            segment: 'ostioproximal',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'minor',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            omMajor: true,
            ramusSize: 'good',
          },
        ],
      }),
    )
    expect(om1Plaque).toContain(
      'OM1 - Major OM: Good sized vessel and Ostioproximal shows minor plaques.',
    )
    expect(om1Plaque).not.toContain('Ostioproximal OM1 - Major OM')

    const pda = generateNote(
      base({
        baselineAngio: [
          {
            id: 'pda',
            vessel: 'PDA',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'good',
          },
        ],
      }),
    )
    expect(pda).toContain('PDA: Good sized vessel and Normal.')

    const plv = generateNote(
      base({
        baselineAngio: [
          {
            id: 'plv',
            vessel: 'PLV',
            segment: 'proximal',
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'small',
          },
        ],
      }),
    )
    expect(plv).toContain('PLV: Small sized vessels and Proximal shows 70% stenosis.')

    const lpda = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lpda',
            vessel: 'LPDA',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'good',
          },
        ],
      }),
    )
    expect(lpda).toContain('LCX: Normal. LPDA: Good sized vessel and Normal.')
    expect(lpda).not.toMatch(/\nLPDA:/)
  })

  it('prefixes a major OM vessel name, then the remaining finding', () => {
    const om1 = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'OM1',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            omMajor: true,
          },
        ],
      }),
    )
    expect(om1).toContain('LCX: Normal. Mid OM1 - Major OM shows 80% stenosis.')
    expect(om1).not.toContain('OM1: Mid')
    expect(om1).not.toContain('Mid Major OM shows')
    expect(om1).not.toMatch(/\nOM1/)

    const om2 = generateNote(
      base({
        baselineAngio: [
          {
            id: '2',
            vessel: 'OM2',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(om2).toContain('LCX: Normal. OM2: Normal.')
    expect(om2).not.toContain('Major OM')
    expect(om2).not.toMatch(/\nOM2/)

    const om3 = generateNote(
      base({
        baselineAngio: [
          {
            id: '3',
            vessel: 'OM3',
            segment: 'proximal',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: true,
            omMajor: true,
          },
        ],
      }),
    )
    expect(om3).toContain('LCX: Normal. OM3 - Major OM: Proximal: Normal.')
    expect(om3).toContain('Target vessel: proximal OM3 - Major OM.')
    expect(om3).not.toMatch(/\nOM3/)
  })

  it('prefixes a major diagonal vessel name, then the remaining finding', () => {
    const d1 = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'D1',
            segment: 'mid',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            omMajor: true,
          },
        ],
      }),
    )
    expect(d1).toContain('LAD: Normal. Mid Major Diagonal shows 80% stenosis.')
    expect(d1).not.toContain('D1: Mid')
    expect(d1).not.toContain('D1 - Major')
    expect(d1).not.toMatch(/\nD1/)

    const d2 = generateNote(
      base({
        baselineAngio: [
          {
            id: '2',
            vessel: 'D2',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(d2).toContain('LAD: Normal. D2: Normal.')
    expect(d2).not.toContain('Major Diagonal')
    expect(d2).not.toMatch(/\nD2/)

    const d3 = generateNote(
      base({
        baselineAngio: [
          {
            id: '3',
            vessel: 'D3',
            segment: 'proximal',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: true,
            omMajor: true,
          },
        ],
      }),
    )
    expect(d3).toContain('LAD: Normal. Major Diagonal: Proximal: Normal.')
    expect(d3).toContain('Target vessel: proximal Major Diagonal.')
    expect(d3).not.toContain('D3 - Major')
    expect(d3).not.toMatch(/\nD3/)
  })

  it('prints vessels as LMCA, LAD, Ramus, LCX, RCA, folding diagonals into LAD and OMs into LCX', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'om2',
            vessel: 'OM2',
            segment: 'mid',
            stenosis: 70,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'd2',
            vessel: 'D2',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'rca',
            vessel: 'RCA',
            segment: 'proximal',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'om1',
            vessel: 'OM1',
            segment: 'proximal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            omMajor: true,
          },
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 3,
            features: [],
            isTarget: false,
          },
          {
            id: 's1',
            vessel: 'S1',
            segment: 'ostial',
            stenosis: 50,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'ramus',
            vessel: 'Ramus',
            segment: 'proximal',
            stenosis: 30,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lcx',
            vessel: 'LCX',
            lcxDominance: 'dominant',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'd1',
            vessel: 'D1',
            segment: 'ostial',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )

    expect(note).toContain(
      'LAD: Mid LAD shows 40% stenosis. TIMI III flow. Ostial D1 shows 90% stenosis. D2: Normal. Ostial S1 shows 50% stenosis.',
    )
    expect(note).toContain(
      'LCX: Dominant vessel and Normal. Proximal OM1 - Major OM shows 80% stenosis. Mid OM2 shows 70% stenosis.',
    )
    expect(note).not.toMatch(/\nD1:/)
    expect(note).not.toMatch(/\nD2:/)
    expect(note).not.toMatch(/\nS1:/)
    expect(note).not.toMatch(/\nOM1/)
    expect(note).not.toMatch(/\nOM2/)
    expect(note).not.toContain('D3:')
    expect(note).not.toContain('OM3:')

    const lmca = note.indexOf('\nLMCA:')
    const lad = note.indexOf('\nLAD:')
    const ramus = note.indexOf('\nRamus:')
    const lcx = note.indexOf('\nLCX:')
    const rca = note.indexOf('\nRCA:')
    expect(lmca).toBeGreaterThan(-1)
    expect(lad).toBeGreaterThan(lmca)
    expect(ramus).toBeGreaterThan(lad)
    expect(lcx).toBeGreaterThan(ramus)
    expect(rca).toBeGreaterThan(lcx)
    expect(note).toContain('Ramus: Proximal Ramus shows 30% stenosis.')
    expect(note).toContain('RCA: Proximal RCA shows 90% stenosis.')
  })

  it('names a percent lesion the same way as stenosis', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 70,
            findingType: 'lesion',
            stenosisMode: 'range',
            stenosisRange: 10,
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Mid LAD shows 70–80% lesion. TIMI III flow.')
    expect(note).not.toContain('70–80% stenosis')
  })

  it('omits TIMI when none is selected and places distal notes after the finding', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            segment: 'distal',
            stenosis: 70,
            findingType: 'lesion',
            stenosisMode: 'range',
            stenosisRange: 10,
            timiFlow: 'none',
            features: [],
            isTarget: false,
            distalNote: 'Involving LAD ostium',
          },
        ],
      }),
    )
    expect(note).toContain('Distal LMCA shows 70–80% lesion, involving LAD ostium.')
    expect(note).not.toContain('Distal LMCA shows 70–80% lesion, involving LAD ostium. TIMI')
    expect(note).not.toContain('involving LAD ostium shows')
  })

  it('notes LMCA separate origin without length', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            stenosis: 0,
            timiFlow: 3,
            features: [],
            isTarget: false,
            separateOrigin: true,
            lengthMode: 'category',
            lengthCategory: 'short',
          },
        ],
      }),
    )
    expect(note).toContain('LMCA: separate origin of LAD and LCX.')
    expect(note).not.toContain('short')
  })

  it('notes LMCA length category when origin is not separate', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            stenosis: 0,
            timiFlow: 3,
            features: [],
            isTarget: false,
            lengthMode: 'category',
            lengthCategory: 'short',
          },
        ],
      }),
    )
    expect(note).toContain('LMCA: Short and Normal.')
  })

  it('notes LMCA length in millimetres when mm mode is selected', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm',
            vessel: 'LMCA',
            stenosis: 0,
            timiFlow: 3,
            features: [],
            isTarget: false,
            lengthMode: 'mm',
            lengthMm: '10',
          },
        ],
      }),
    )
    expect(note).toContain('LMCA: 10 mm and Normal.')
  })

  it('includes access special notes only when a value is present', () => {
    const none = generateNote(base())
    expect(none).not.toContain('Special Notes:')
    expect(none).toContain('ACCESS')

    const preset = generateNote(
      base({
        access: {
          ...emptyProcedure('test').access,
          specialNote: 'Radial artery calcification',
        },
      }),
    )
    expect(preset).toContain('Special Notes: Radial artery calcification')
    expect(preset.indexOf('ACCESS')).toBeLessThan(preset.indexOf('Special Notes: Radial artery calcification'))
    expect(preset.indexOf('Special Notes: Radial artery calcification')).toBeLessThan(preset.indexOf('CORONARY ANGIOGRAM'))

    const otherBlank = generateNote(
      base({
        access: {
          ...emptyProcedure('test').access,
          specialNote: 'Other',
          specialNoteCustom: '   ',
        },
      }),
    )
    expect(otherBlank).not.toContain('Special Notes:')

    const other = generateNote(
      base({
        access: {
          ...emptyProcedure('test').access,
          specialNote: 'Other',
          specialNoteCustom: 'High radial takeoff',
        },
      }),
    )
    expect(other).toContain('Special Notes: High radial takeoff')
  })

  it('renders a CAG note without PCI, using conclusion instead of result', () => {
    const note = generateNote(
      base({
        kind: 'cag',
        indication: {
          chips: ['CSA'],
          symptoms: ['Chest Pain'],
          grafts: [],
          valveSurgeries: [],
          stentTerritories: [],
          pciType: 'Primary',
        },
        dominance: 'Right',
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 70,
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
        events: [
          ev(
            'stent',
            {
              name: 'Supraflex Cruz',
              type: 'DES',
              diameterMm: 3.0,
              lengthMm: 18,
              vessel: 'LAD',
              segment: 'mid',
              deployedAtAtm: 14,
              seconds: 20,
            },
            's1',
          ),
        ],
        notes: 'Advise medical management.',
      }),
    )
    expect(note.startsWith('CAG — PROCEDURE NOTE')).toBe(true)
    expect(note).not.toContain('PTCA')
    expect(note).not.toContain('Time:')
    expect(note).toContain('Indication: chronic stable angina')
    expect(note).not.toContain('primary PCI')
    expect(note).toContain('LAD: Mid LAD shows 70% stenosis. TIMI III flow.')
    expect(note).not.toContain('Target vessel')
    expect(note).toContain('ACCESS\nRight radial artery.')
    expect(note).not.toContain('Access: Right radial')
    expect(note).not.toContain('sheath inserted')
    expect(note).not.toContain('accessed')
    expect(note).not.toMatch(/\nPROCEDURE\n/)
    expect(note).not.toContain('Supraflex Cruz')
    expect(note).not.toMatch(/\nRESULT\n/)
    expect(note).toMatch(/\nIMPRESSION\n/)
    expect(note).not.toMatch(/\nCONCLUSION\n/)
    expect(note.indexOf('CORONARY ANGIOGRAM')).toBeLessThan(note.indexOf('\nIMPRESSION\n'))
    expect(note).toContain('IMPRESSION\nNot recorded.')
    expect(note).toContain('ADVICE\nNot recorded.')
    expect(note.indexOf('\nIMPRESSION\n')).toBeLessThan(note.indexOf('\nADVICE\n'))
    expect(note).not.toContain('LIMA :')
    expect(note).not.toContain('RIMA :')
    expect(note).not.toContain('Good angiographic result')
    expect(note).not.toContain('Heparin')
    expect(note).not.toContain('Sheath removed')
    expect(note).not.toMatch(/\nPERIPROCEDURAL\n/)
    expect(note).not.toMatch(/\nCLOSURE\n/)
    expect(note).toMatch(/\nFINAL\n/)
    expect(note).toContain('Advise medical management.')
    expect(note).not.toMatch(/\nNOTES\n/)
  })

  it('writes CAG impression options into the impression section', () => {
    const svd = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['svd'],
      }),
    )
    expect(svd).toContain('IMPRESSION\nCAD - Single Vessel Disease.')
    expect(svd).not.toContain('\nSVD.')
    expect(svd).not.toContain('IMPRESSION\nNot recorded.')
    expect(svd).not.toMatch(/\nPERIPROCEDURAL\n/)
    expect(svd).not.toMatch(/\nCLOSURE\n/)

    const lmTvd = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['lm-tvd'],
      }),
    )
    expect(lmTvd).toContain('IMPRESSION\nLM + Triple Vessel Disease.')
    expect(lmTvd).not.toContain('\nLM + TVD.')

    const lmCombo = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['lm-svd', 'lm-dvd'],
      }),
    )
    expect(lmCombo).toContain(
      'IMPRESSION\nLM + Single Vessel Disease.\nLM + Double Vessel Disease.',
    )

    const both = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['tvd', 'ectasia'],
      }),
    )
    expect(both).toContain('IMPRESSION\nCAD - Triple Vessel Disease.\nCoronary artery ectasia.')

    const slow = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['mild-cad', 'ectasia-slow-flow'],
      }),
    )
    expect(slow).toContain(
      'IMPRESSION\nMild CAD.\nCoronary artery ectasia with slow flow.',
    )

    const mixed = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['svd', 'dvd', 'ectasia'],
        cagCustomImpressions: ['Myocardial bridging', 'Slow flow'],
      }),
    )
    expect(mixed).toContain(
      'IMPRESSION\nCAD - Single Vessel Disease.\nCAD - Double Vessel Disease.\nCoronary artery ectasia.\nMyocardial bridging.\nSlow flow.',
    )

    const normal = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['normal-epicardial'],
      }),
    )
    expect(normal).toContain('IMPRESSION\nNormal epicardial coronary arteries.')
  })

  it('writes patient-page lab details as labelled lines and omits blanks', () => {
    const note = generateNote(
      base({
        lab: {
          doctorName: 'Dr. Rao',
          technologist: 'Anita',
          scrubNurse: 'Meera',
          access: 'Right radial',
          catheter: '5F TIG',
          contrast: 'Iohexol 40 mL',
          haemodynamicData: 'Stable throughout',
          aorticPressureMmHg: '130/80',
          inventory: '',
          lvedp: '',
        },
      }),
    )
    expect(note).toContain('Doctor Name: Dr. Rao')
    expect(note).toContain('Technologist: Anita')
    expect(note).toContain('Scrub Nurse: Meera')
    expect(note).not.toContain('Access: Right radial')
    expect(note).toContain('ACCESS\nRight radial artery; 6F sheath inserted.')
    expect(note).toContain('Catheter: 5F TIG')
    expect(note).toContain('Contrast: Iohexol 40 mL')
    expect(note).toContain('Haemodynamic Data: Stable throughout')
    expect(note).toContain('Aortic Pressure: 130/80 mmHg')
    expect(note.indexOf('Operators:')).toBeLessThan(note.indexOf('Doctor Name:'))
    expect(note.indexOf('Aortic Pressure:')).toBeLessThan(note.indexOf('\nACCESS\n'))

    const empty = generateNote(base())
    expect(empty).not.toContain('Doctor Name:')
    expect(empty).not.toContain('Technologist:')
    expect(empty).not.toContain('Aortic Pressure:')
    expect(empty).not.toContain('Access: Right radial')
    expect(empty).toContain('ACCESS\nRight radial artery; 6F sheath inserted.')

    const fromAccessPage = generateNote(
      base({
        access: {
          site: 'femoral',
          side: 'left',
          sheathSize: '6F',
          punctures: 1,
          singleAttempt: true,
          specialNote: '',
          specialNoteCustom: '',
        },
        lab: {
          doctorName: '',
          technologist: '',
          scrubNurse: '',
          access: 'RRA',
          catheter: '5F TIG',
          contrast: 'Omnipaque 30 mL',
          haemodynamicData: '',
          aorticPressureMmHg: '',
          inventory: '',
          lvedp: '',
        },
      }),
    )
    expect(fromAccessPage).not.toContain('Access: Left femoral')
    expect(fromAccessPage).not.toContain('Access: RRA')
    expect(fromAccessPage).toContain('ACCESS\nLeft femoral artery; 6F sheath inserted.')
    expect(fromAccessPage.indexOf('Catheter: 5F TIG')).toBeLessThan(fromAccessPage.indexOf('Contrast: Omnipaque 30 mL'))
  })

  it('writes CAG advice options after impression, each on its own line', () => {
    const omt = generateNote(
      base({
        kind: 'cag',
        cagAdvices: ['omt'],
      }),
    )
    expect(omt).toContain('ADVICE\nOMT.')
    expect(omt).not.toContain('Optimal medical therapy')
    expect(omt.indexOf('\nIMPRESSION\n')).toBeLessThan(omt.indexOf('\nADVICE\n'))

    const vessels = generateNote(
      base({
        kind: 'cag',
        cagImpressions: ['svd'],
        cagAdvices: ['ptca-lad', 'ptca-lcx', 'emergency-cabg'],
        cagCustomAdvices: ['Review in 2 weeks'],
      }),
    )
    expect(vessels).toContain('IMPRESSION\nCAD - Single Vessel Disease.')
    expect(vessels).toContain(
      'ADVICE\nPTCA to LAD.\nPTCA to LCX.\nEmergency CABG.\nReview in 2 weeks.',
    )

    const primary = generateNote(
      base({
        kind: 'cag',
        cagAdvices: ['primary-ptca-lad'],
        cagCustomAdvices: ['PRIMARY PTCA -> LCX'],
      }),
    )
    expect(primary).toContain('ADVICE\nPRIMARY PTCA → LAD.\nPRIMARY PTCA → LCX.')
    expect(primary).not.toContain('->')
  })

  it('includes LIMA and RIMA lines only when their toggles are on', () => {
    const off = generateNote(
      base({
        kind: 'cag',
        cagLimaNote: 'patent',
        cagRimaNote: 'occluded',
      }),
    )
    expect(off).not.toContain('LIMA :')
    expect(off).not.toContain('RIMA :')
    expect(off).not.toContain('patent')
    expect(off).not.toContain('occluded')

    const lima = generateNote(
      base({
        kind: 'cag',
        cagLimaOn: true,
        cagLimaNote: 'patent, good flow',
      }),
    )
    expect(lima).toContain('LIMA : patent, good flow')
    expect(lima).not.toContain('RIMA :')
    expect(lima.indexOf('LIMA : patent, good flow')).toBeLessThan(lima.indexOf('\nIMPRESSION\n'))

    const both = generateNote(
      base({
        kind: 'cag',
        cagLimaOn: true,
        cagLimaNote: 'patent',
        cagRimaOn: true,
        cagRimaNote: 'not visualised',
      }),
    )
    expect(both).toContain('LIMA : patent\nRIMA : not visualised')
    expect(both.indexOf('RIMA : not visualised')).toBeLessThan(both.indexOf('\nIMPRESSION\n'))
  })

  it('records multiple segment issues on the same vessel', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad-prox',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 3,
            features: [],
            isTarget: true,
            ladType: 'II',
          },
          {
            id: 'lad-mid',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 3,
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(note).toContain(
      'LAD: Type II Vessel. Proximal LAD shows 90% stenosis. TIMI III flow followed by mid LAD shows 40% stenosis. TIMI III flow.',
    )
    expect(note).toContain('Target vessels: proximal LAD and mid LAD.')
    expect(note.split('\n').filter((line) => line.startsWith('LAD:'))).toHaveLength(1)
  })

  it('orders same-vessel issues by anatomy even if they were saved out of order', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad-mid',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lad-prox',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'I',
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Type I Vessel. Proximal LAD shows 90% stenosis followed by mid LAD shows 40% stenosis.')
  })

  it('keeps LMCA length once when two segments are diseased', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lm-prox',
            vessel: 'LMCA',
            segment: 'proximal',
            stenosis: 50,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            lengthMode: 'category',
            lengthCategory: 'short',
          },
          {
            id: 'lm-dist',
            vessel: 'LMCA',
            segment: 'distal',
            stenosis: 70,
            findingType: 'lesion',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('LMCA: Short.\nProximal LMCA shows 50% stenosis followed by distal LMCA shows 70% lesion.')
  })

  it('appends two D1 segment issues onto the LAD paragraph', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad',
            vessel: 'LAD',
            stenosis: 0,
            findingType: 'normal',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'd1-ost',
            vessel: 'D1',
            segment: 'ostial',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ramusSize: 'good',
          },
          {
            id: 'd1-mid',
            vessel: 'D1',
            segment: 'mid',
            stenosis: 40,
            findingType: 'plaque',
            plaqueGrade: 'mild',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain(
      'LAD: Normal. D1: Good sized vessel and Ostial shows 90% stenosis followed by mid shows mild plaques.',
    )
  })

  it('uses a custom connector between same-vessel issues', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad-prox',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lad-mid',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            joinBefore: 'and then',
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Proximal LAD shows 90% stenosis and then mid LAD shows 40% stenosis.')
  })

  it('writes total occlusion without a percent', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 0,
            findingType: 'total-occlusion',
            timiFlow: 0,
            features: [],
            isTarget: true,
          },
        ],
      }),
    )
    expect(note).toContain('LAD: Proximal LAD shows total occlusion. TIMI 0 flow.')
    expect(note).not.toContain('chronic total occlusion')
    expect(note).not.toContain('Proximal shows 0%')
  })

  it('writes mildly ectatic vessel without a percent', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'LCX',
            segment: 'proximal',
            stenosis: 0,
            findingType: 'mildly-ectatic-vessel',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('LCX: Proximal LCX shows mildly ectatic vessel.')
    expect(note).not.toContain('Proximal LCX shows 0%')
  })

  it('appends condition Other text after shows', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: '1',
            vessel: 'RCA',
            segment: 'mid',
            stenosis: 0,
            findingType: 'other',
            findingOther: 'slow flow with recanalised channels',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain('RCA: Mid RCA shows slow flow with recanalised channels.')
  })

  it('names the vessel after each segment, including branch vessels without a segment', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad-ost',
            vessel: 'LAD',
            segment: 'ostial',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'minor',
            timiFlow: 'none',
            features: [],
            isTarget: false,
            ladType: 'III',
          },
          {
            id: 'lad-prox',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lad-mid',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'other',
            plaqueOther: '90',
            timiFlow: 'none',
            features: ['diffuse'],
            isTarget: false,
          },
          {
            id: 'd1',
            vessel: 'D1',
            stenosis: 0,
            findingType: 'plaque',
            plaqueGrade: 'other',
            plaqueOther: '30',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain(
      'LAD: Type III Vessel. Ostial LAD shows minor plaques followed by proximal LAD shows 80% stenosis and mid LAD shows 90% diffuse plaques. D1 shows 30% plaques.',
    )
    expect(note).not.toContain('D1: shows')
    expect(note).not.toContain('Ostial shows')
  })

  it('defaults later same-vessel connectors to and then a comma', () => {
    const note = generateNote(
      base({
        baselineAngio: [
          {
            id: 'lad-ost',
            vessel: 'LAD',
            segment: 'ostial',
            stenosis: 30,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lad-prox',
            vessel: 'LAD',
            segment: 'proximal',
            stenosis: 80,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lad-mid',
            vessel: 'LAD',
            segment: 'mid',
            stenosis: 90,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
          {
            id: 'lad-dist',
            vessel: 'LAD',
            segment: 'distal',
            stenosis: 40,
            findingType: 'stenosis',
            timiFlow: 'none',
            features: [],
            isTarget: false,
          },
        ],
      }),
    )
    expect(note).toContain(
      'LAD: Ostial LAD shows 30% stenosis followed by proximal LAD shows 80% stenosis and mid LAD shows 90% stenosis, distal LAD shows 40% stenosis.',
    )
  })
})
