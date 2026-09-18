import { describe, expect, it } from 'vitest'
import { emptyProcedure } from '@/lib/seed'
import {
  accessShortCode,
  ptcaCommentSentence,
  ptcaContrastText,
  LONGEST_INVENTORY_LABEL,
  ptcaInventoryBlocks,
  ptcaProcedureNarrative,
  ptcaTitle,
  targetVesselsLesions,
  targetVesselsShort,
  isCombinedProcessPartner,
} from '@/lib/ptcaReport'
import type { AngioFinding, Procedure } from '@/types/procedure'

function finding(over: Partial<AngioFinding> = {}): AngioFinding {
  return {
    id: 'f1',
    vessel: 'LAD',
    stenosis: 80,
    timiFlow: 3,
    features: [],
    isTarget: true,
    ...over,
  }
}

function hameed(): Procedure {
  const p = emptyProcedure('ptca-template')
  return {
    ...p,
    indication: { ...p.indication, pciType: 'Primary' },
    patient: {
      ...p.patient,
      name: 'Hameed',
      age: 55,
      sex: 'M',
      hospitalId: '25130',
      ipNo: '610024',
      date: '2024-09-14',
    },
    access: {
      ...p.access,
      site: 'radial',
      side: 'right',
      sheathSize: '6F',
      sheathBrand: 'Glidesheath Slender',
    },
    baselineAngio: [finding({ stenosis: 80, features: ['thrombotic'] })],
    lab: {
      ...p.lab,
      contrast: 'Omnipaque 100 mL',
      aorticPressureMmHg: '130/80',
    },
    periprocedural: { ...p.periprocedural, heparinIU: 7000 },
    events: [
      {
        id: 'g1',
        at: 1,
        kind: 'guideCatheter',
        data: { curve: 'EBU 3.5', size: '6F', coronary: 'left' },
      },
      {
        id: 'w1',
        at: 2,
        kind: 'guidewire',
        data: { name: 'Runthrough NS Floppy', type: 'workhorse', vessel: 'LAD', parkedSegment: 'distal' },
      },
      {
        id: 'b1',
        at: 3,
        kind: 'predilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 2.5,
          lengthMm: 12,
          vessel: 'LAD',
          segment: 'proximal',
          inflations: [
            { atm: 14, seconds: 15 },
            { atm: 16, seconds: 15 },
            { atm: 16, seconds: 15 },
          ],
        },
      },
      {
        id: 'b2',
        at: 4,
        kind: 'predilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 3.5,
          lengthMm: 12,
          vessel: 'LAD',
          segment: 'proximal',
          inflations: [
            { atm: 18, seconds: 15 },
            { atm: 18, seconds: 15 },
            { atm: 18, seconds: 15 },
          ],
        },
      },
      {
        id: 's1',
        at: 5,
        kind: 'stent',
        data: {
          name: 'Xience Sierra',
          type: 'DES',
          diameterMm: 3.5,
          lengthMm: 38,
          vessel: 'LAD',
          segment: 'proximal-mid',
          deployedAtAtm: 12,
          seconds: 20,
        },
      },
      {
        id: 'p1',
        at: 6,
        kind: 'postdilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 3.5,
          lengthMm: 12,
          vessel: 'LAD',
          inflations: [
            { atm: 20, seconds: 15 },
            { atm: 20, seconds: 15 },
            { atm: 20, seconds: 15 },
            { atm: 20, seconds: 15 },
            { atm: 22, seconds: 15 },
            { atm: 22, seconds: 15 },
          ],
        },
      },
      {
        id: 'p2',
        at: 7,
        kind: 'postdilatation',
        data: {
          name: 'Apex NC',
          type: 'non-compliant',
          diameterMm: 3.75,
          lengthMm: 12,
          vessel: 'LAD',
          inflations: [
            { atm: 16, seconds: 15 },
            { atm: 16, seconds: 15 },
            { atm: 16, seconds: 15 },
            { atm: 16, seconds: 15 },
          ],
        },
      },
    ],
  }
}

describe('PTCA handwritten report', () => {
  it('uses 1° title for Primary PCI', () => {
    expect(ptcaTitle(hameed())).toBe('1° PTCA REPORT')
    expect(ptcaTitle(emptyProcedure())).toBe('PTCA REPORT')
  })

  it('codes vascular access as RRA', () => {
    expect(accessShortCode(hameed().access)).toBe('RRA')
  })

  it('lists a single target vessel with stenosis', () => {
    expect(targetVesselsLesions(hameed())).toBe('LAD (80% Thrombotic)')
  })

  it('joins two target vessels with and', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({ id: 'f1', vessel: 'OM1', stenosis: 80, isTarget: true, features: [] }),
      finding({ id: 'f2', vessel: 'LAD', stenosis: 90, isTarget: true, features: [] }),
    ]
    p.events = [
      {
        id: 'w1',
        at: 1,
        kind: 'guidewire',
        data: { name: 'BMW', type: 'workhorse', vessel: 'OM1', parkedSegment: 'distal' },
      },
      {
        id: 'w2',
        at: 2,
        kind: 'guidewire',
        data: { name: 'BMW', type: 'workhorse', vessel: 'LAD', parkedSegment: 'distal' },
      },
    ]
    expect(targetVesselsLesions(p)).toBe('OM1 (80%) and LAD (90%)')
  })

  it('prints a stenosis range on the target line', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({ stenosis: 80, stenosisMode: 'range', stenosisRange: 10, isTarget: true, features: [] }),
    ]
    expect(targetVesselsLesions(p)).toBe('LAD (80–90%)')
  })

  it('places lesion description after stenosis inside the parentheses', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({ stenosis: 99, isTarget: true, features: ['diffuse', 'calcific'] }),
    ]
    expect(targetVesselsLesions(p)).toBe('LAD (99% Diffuse, Calcific)')
  })

  it('prints a custom vessel description after stenosis', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({
        vessel: 'RCA',
        stenosis: 100,
        isTarget: true,
        features: [],
        descriptionCustom: 'Thrombotic Occlusion',
      }),
    ]
    p.events = [
      {
        id: 'w1',
        at: 1,
        kind: 'guidewire',
        data: { name: 'BMW', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' },
      },
    ]
    expect(targetVesselsLesions(p)).toBe('RCA (100% Thrombotic Occlusion)')
  })

  it('prefixes the selected segment and prints Thrombotic occlusion', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({
        vessel: 'RCA',
        segment: 'proximal',
        stenosis: 100,
        isTarget: true,
        features: ['thrombotic-occlusion'],
      }),
    ]
    p.events = [
      {
        id: 'w1',
        at: 1,
        kind: 'guidewire',
        data: { name: 'BMW', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' },
      },
    ]
    expect(targetVesselsLesions(p)).toBe('Proximal RCA (100% Thrombotic occlusion)')
  })

  it('prints Near total as a vessel description', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({
        vessel: 'LAD',
        stenosis: 99,
        isTarget: true,
        features: ['near-total'],
      }),
    ]
    expect(targetVesselsLesions(p)).toBe('LAD (99% Near total)')
  })

  it('groups inventory under PTCA → vessel for each treated vessel', () => {
    const blocks = ptcaInventoryBlocks(hameed())
    expect(blocks).toHaveLength(1)
    expect(blocks[0].heading).toBe('PTCA → LAD')
    expect(blocks[0].lines.find((l) => l.label === 'Sheath')?.value).toBe('6F Glidesheath Slender')
    expect(blocks[0].lines.find((l) => l.label === 'Catheter')?.value).toBe('6F EBU 3.5')
    expect(blocks[0].lines.find((l) => l.label === 'Guide wire')?.value).toBe('0.014" Runthrough NS Floppy')
    expect(blocks[0].lines.find((l) => l.label === 'Pre dilatation balloon')?.value).toBe(
      '2.5x12mm Accuforce NC @ 14, 16, 16 atm\n3.5x12mm Accuforce NC @ 18, 18, 18 atm',
    )
    expect(blocks[0].lines.find((l) => l.label === 'Stent')?.value).toBe('3.5 x 38mm Xience Sierra @ 12 atm')
    expect(blocks[0].lines.find((l) => l.label === 'Post dilatation balloon')?.value).toBe(
      '3.5x12mm Accuforce NC @ 20, 20, 20, 20, 22, 22 atm\n3.75x12mm Apex NC @ 16, 16, 16, 16 atm',
    )
    expect(blocks[0].lines.map((l) => l.label)).toEqual([
      'Sheath',
      'Catheter',
      'Guide wire',
      'Pre dilatation balloon',
      'Stent',
      'Post dilatation balloon',
    ])
  })

  it('uses Post dilatation balloon as the longest inventory label for colon alignment', () => {
    const labels = ptcaInventoryBlocks(hameed())[0].lines.map((l) => l.label)
    expect(labels.every((label) => label.length <= LONGEST_INVENTORY_LABEL.length)).toBe(true)
    expect(LONGEST_INVENTORY_LABEL).toBe('Post dilatation balloon')
  })

  it('fills thrombus aspiration, microcatheter and guide extension on the report', () => {
    const p = hameed()
    p.events = [
      p.events[0],
      {
        id: 'a1',
        at: 1.5,
        kind: 'thrombusAspiration',
        data: { name: 'Export', size: '6F', vessel: 'LAD' },
      },
      {
        id: 'm1',
        at: 1.7,
        kind: 'microcatheter',
        data: { name: 'Finecross', size: '1.8F', vessel: 'LAD' },
      },
      p.events[1],
      {
        id: 'x1',
        at: 2.5,
        kind: 'guideExtension',
        data: { name: 'GuideLiner', size: '6F', vessel: 'LAD' },
      },
      ...p.events.slice(2),
    ]
    const lines = ptcaInventoryBlocks(p)[0].lines
    expect(lines.map((l) => l.label)).toEqual([
      'Sheath',
      'Catheter',
      'Thrombus aspiration',
      'Microcatheter',
      'Guide wire',
      'Guide extension',
      'Pre dilatation balloon',
      'Stent',
      'Post dilatation balloon',
    ])
    expect(lines.find((l) => l.label === 'Thrombus aspiration')?.value).toBe('Export 6F')
    expect(lines.find((l) => l.label === 'Microcatheter')?.value).toBe('Finecross 1.8F')
    expect(lines.find((l) => l.label === 'Guide extension')?.value).toBe('GuideLiner 6F')
    expect(lines.every((l) => l.label.length <= LONGEST_INVENTORY_LABEL.length)).toBe(true)
    const note = ptcaProcedureNarrative(p)
    expect(note).toContain('Thrombus aspiration was performed using Export 6F')
    expect(note).toContain('A Finecross 1.8F microcatheter was used')
    expect(note).toContain('A GuideLiner 6F guide extension was used')
  })

  it('prints LMCA POT after Post dilatation balloon', () => {
    const p = hameed()
    p.events = [
      ...p.events,
      {
        id: 'pot1',
        at: 9,
        kind: 'lmcaPot',
        data: {
          name: 'NC Sapphire',
          type: 'non-compliant',
          diameterMm: 4.0,
          lengthMm: 8,
          vessel: 'LAD',
          segment: 'ostial',
          inflations: [{ atm: 18, seconds: 15 }],
        },
      },
    ]
    const lines = ptcaInventoryBlocks(p)[0].lines
    expect(lines.map((l) => l.label)).toEqual([
      'Sheath',
      'Catheter',
      'Guide wire',
      'Pre dilatation balloon',
      'Stent',
      'Post dilatation balloon',
      'LMCA POT',
    ])
    expect(lines.find((l) => l.label === 'LMCA POT')?.value).toBe('4.0x8mm NC Sapphire @ 18 atm')
    expect(ptcaProcedureNarrative(p)).toContain(
      'LMCA POT was performed with a 4.0x8mm NC Sapphire balloon at 18atm',
    )
  })

  it('prints a separate inventory block for each target vessel', () => {
    const p = hameed()
    p.baselineAngio = [
      finding({ id: 'f1', vessel: 'LAD', stenosis: 90, isTarget: true }),
      finding({ id: 'f2', vessel: 'RCA', stenosis: 80, isTarget: true, features: [] }),
    ]
    p.events = [
      ...p.events,
      {
        id: 'w2',
        at: 8,
        kind: 'guidewire',
        data: { name: 'Sion', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' },
      },
      {
        id: 's2',
        at: 9,
        kind: 'stent',
        data: {
          name: 'Xience Sierra',
          type: 'DES',
          diameterMm: 3.0,
          lengthMm: 28,
          vessel: 'RCA',
          segment: 'proximal',
          deployedAtAtm: 14,
          seconds: 20,
        },
      },
    ]
    const blocks = ptcaInventoryBlocks(p)
    expect(blocks.map((b) => b.heading)).toEqual(['PTCA → LAD', 'PTCA → RCA'])
    expect(blocks[1].lines.find((l) => l.label === 'Sheath')?.value).toBe('6F Glidesheath Slender')
    expect(blocks[1].lines.find((l) => l.label === 'Guide wire')?.value).toBe('0.014" Sion')
    expect(blocks[1].lines.find((l) => l.label === 'Stent')?.value).toBe('3.0 x 28mm Xience Sierra @ 14 atm')
  })

  it('uses POBA → vessel when that vessel is marked POBA', () => {
    const p = emptyProcedure('ptca-template')
    p.baselineAngio = [finding({ vessel: 'LCX', stenosis: 70, isTarget: true })]
    p.vesselPciKind = { LCX: 'POBA' }
    p.events = [
      {
        id: 'w1',
        at: 1,
        kind: 'guidewire',
        data: { name: 'Sion', size: '0.014"', vessel: 'LCX' },
      },
      {
        id: 'b1',
        at: 2,
        kind: 'predilatation',
        data: {
          name: 'AperiNC',
          type: 'non-compliant',
          diameterMm: 2.5,
          lengthMm: 12,
          vessel: 'LCX',
          segment: 'proximal',
          inflations: [{ atm: 14, seconds: 15 }],
        },
      },
    ]
    expect(ptcaInventoryBlocks(p).map((b) => b.heading)).toEqual(['POBA → LCX'])
    expect(ptcaCommentSentence(p)).toBe('POBA OF LCX WAS DONE SUCCESSFULLY')
  })

  it('defaults inventory headings to PTCA and uses POBA without hardware once selected', () => {
    const p = emptyProcedure('ptca-template')
    p.baselineAngio = [finding({ vessel: 'LCX', stenosis: 80, isTarget: true })]
    expect(ptcaInventoryBlocks(p).map((b) => b.heading)).toEqual(['PTCA → LCX'])
    p.vesselPciKind = { LCX: 'POBA' }
    expect(ptcaInventoryBlocks(p).map((b) => b.heading)).toEqual(['POBA → LCX'])
  })

  it('headlines LMCA combined with LAD as PTCA → LMCA - LAD', () => {
    const p = emptyProcedure('ptca-template')
    p.baselineAngio = [finding({ vessel: 'LMCA', stenosis: 90, isTarget: true })]
    p.vesselCombined = { LMCA: { on: true, vessels: ['LAD'] } }
    expect(ptcaInventoryBlocks(p).map((b) => b.heading)).toEqual(['PTCA → LMCA - LAD'])
    expect(isCombinedProcessPartner(p, 'LAD')).toBe(true)
    expect(isCombinedProcessPartner(p, 'LMCA')).toBe(false)
    expect(targetVesselsShort(p)).toBe('LM - LAD')
    expect(ptcaCommentSentence(p)).toBe('PTCA OF LM - LAD WAS DONE SUCCESSFULLY')
    p.vesselCombined = { LMCA: { on: false, vessels: ['LAD'] } }
    expect(ptcaInventoryBlocks(p).map((b) => b.heading)).toEqual(['PTCA → LMCA'])
  })

  it('does not print a separate inventory for a combined partner vessel', () => {
    const p = emptyProcedure('ptca-template')
    p.baselineAngio = [
      finding({ id: 'lm', vessel: 'LMCA', stenosis: 90, isTarget: true, features: [] }),
      finding({ id: 'lad', vessel: 'LAD', stenosis: 80, isTarget: true, features: [] }),
    ]
    p.vesselCombined = { LMCA: { on: true, vessels: ['LAD'] } }
    p.events = [
      {
        id: 's1',
        at: 1,
        kind: 'stent',
        data: {
          name: 'Xience Sierra',
          type: 'DES',
          diameterMm: 3.5,
          lengthMm: 38,
          vessel: 'LAD',
          segment: 'proximal',
          deployedAtAtm: 12,
          seconds: 20,
        },
      },
    ]
    const blocks = ptcaInventoryBlocks(p)
    expect(blocks.map((b) => b.heading)).toEqual(['PTCA → LMCA - LAD'])
    expect(blocks[0].lines.find((l) => l.label === 'Stent')?.value).toBe(
      '3.5 x 38mm Xience Sierra @ 12 atm',
    )
  })

  it('prints stenosis for combined partner vessels on the target line', () => {
    const p = emptyProcedure('ptca-template')
    p.baselineAngio = [
      finding({ id: 'lm', vessel: 'LMCA', stenosis: 90, isTarget: true, features: [] }),
      finding({ id: 'lad', vessel: 'LAD', stenosis: 80, isTarget: true, features: [] }),
    ]
    p.vesselCombined = { LMCA: { on: true, vessels: ['LAD'] } }
    expect(targetVesselsLesions(p)).toBe('LM (90%) and LAD (80%)')
  })

  it('keeps combined off until Yes is chosen even if partner vessels are stored', () => {
    const p = emptyProcedure('ptca-template')
    p.vesselCombined = { LMCA: { on: true, vessels: ['LAD', 'LCX'] } }
    expect(ptcaInventoryBlocks(p).map((b) => b.heading)).toEqual(['PTCA → LMCA - LAD - LCX'])
  })

  it('writes the fill-in procedure note and DES comment', () => {
    const note = ptcaProcedureNarrative(hameed())
    expect(note).toBe(
      [
        'Patient was taken up for PTCA with informed consent, RRA access was taken.',
        'Later LCA was cannulated with a 6F EBU 3.5 guiding Catheter.',
        'And the LAD lesion was crossed with a 0.014" Runthrough NS Floppy guide wire and the lesion was predilated sequentially with a 2.5x12mm Accuforce NC balloon at 14,16,16atm and 3.5x12mm Accuforce NC balloon at 18,18,18atm.',
        'Later a 3.5x38mm Xience Sierra stent was deployed to the Proximal to mid LAD at 12atm.',
        'The proximal, mid, distal part of the stent was post dilated with a 3.5x12mm Accuforce NC balloon at 20,20,20,20,22,22atm and 3.75x12mm Apex NC balloon at 16,16,16,16atm.',
        'Check shoots revealed well deployed stent with no residual stenosis, no thrombus, no dissection with good vessel flow distally.',
        'There was no procedure related complications.',
      ].join(' '),
    )
    expect(ptcaCommentSentence(hameed())).toBe('PTCA WITH STENTING OF LAD (1DES) WAS DONE SUCCESSFULLY')
  })

  it('updates check shoots from residual stenosis, dissection, TIMI and thrombus', () => {
    const p = hameed()
    p.outcome = {
      ...p.outcome,
      residualStenosis: 20,
      finalTimiFlow: 2,
      dissection: 'B',
      noReflow: false,
      slowFlow: false,
      sideBranchCompromise: true,
      complications: ['thrombus'],
    }
    expect(ptcaProcedureNarrative(p)).toContain(
      'Check shoots revealed well deployed stent with 20% residual stenosis, thrombus, NHLBI type B dissection with TIMI II flow distally. Side-branch compromise was noted.',
    )
  })

  it('matches the single-vessel reference procedure paragraph', () => {
    const p = emptyProcedure('ptca-template')
    p.access = { ...p.access, site: 'radial', side: 'right' }
    p.baselineAngio = [finding({ stenosis: 85, isTarget: true })]
    p.events = [
      { id: 'g1', at: 1, kind: 'guideCatheter', data: { device: 'EBU', curve: '3.5', size: '6F' } },
      {
        id: 'w1',
        at: 2,
        kind: 'guidewire',
        data: { name: 'Runthrough floppy', type: 'workhorse', vessel: 'LAD', parkedSegment: 'distal' },
      },
      {
        id: 'b1',
        at: 3,
        kind: 'predilatation',
        data: {
          name: 'minitek',
          type: 'semi-compliant',
          diameterMm: 2.0,
          lengthMm: 20,
          vessel: 'LAD',
          inflations: [{ atm: 12, seconds: 15 }, { atm: 14, seconds: 15 }, { atm: 14, seconds: 15 }],
        },
      },
      {
        id: 'b2',
        at: 4,
        kind: 'predilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 2.5,
          lengthMm: 12,
          vessel: 'LAD',
          inflations: [{ atm: 12, seconds: 15 }, { atm: 14, seconds: 15 }],
        },
      },
      {
        id: 's1',
        at: 5,
        kind: 'stent',
        data: {
          name: 'Xience Alpine',
          type: 'DES',
          diameterMm: 2.75,
          lengthMm: 28,
          vessel: 'LAD',
          segment: 'proximal-mid',
          deployedAtAtm: 10,
          seconds: 20,
        },
      },
      {
        id: 'p1',
        at: 6,
        kind: 'postdilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 2.75,
          lengthMm: 12,
          vessel: 'LAD',
          inflations: [
            { atm: 14, seconds: 15 },
            { atm: 20, seconds: 15 },
            { atm: 20, seconds: 15 },
            { atm: 14, seconds: 15 },
          ],
        },
      },
    ]
    expect(ptcaProcedureNarrative(p)).toBe(
      [
        'Patient was taken up for PTCA with informed consent, RRA access was taken.',
        'Later LCA was cannulated with a 6F EBU 3.5 guiding Catheter.',
        'And the LAD lesion was crossed with a 0.014" Runthrough floppy guide wire and the lesion was predilated sequentially with a 2.0x20mm minitek balloon at 12,14,14atm and 2.5x12mm Accuforce NC balloon at 12,14atm.',
        'Later a 2.75x28mm Xience Alpine stent was deployed to the Proximal to mid LAD at 10atm.',
        'The proximal, mid, distal part of the stent was post dilated with a 2.75x12mm Accuforce NC balloon at 14,20,20,14atm.',
        'Check shoots revealed well deployed stent with no residual stenosis, no thrombus, no dissection with good vessel flow distally.',
        'There was no procedure related complications.',
      ].join(' '),
    )
  })

  it('appends deployed-to size in the stent sentence', () => {
    const p = emptyProcedure('ptca-template')
    p.access = { ...p.access, site: 'radial', side: 'right' }
    p.baselineAngio = [finding({ vessel: 'LCX', stenosis: 90, isTarget: true, features: [] })]
    p.events = [
      { id: 'g1', at: 1, kind: 'guideCatheter', data: { device: 'EBU', curve: '3.5', size: '6F' } },
      {
        id: 's1',
        at: 2,
        kind: 'stent',
        data: {
          name: 'METAFOR',
          type: 'DES',
          diameterMm: 2.75,
          lengthMm: 28,
          vessel: 'LCX',
          segment: 'proximal-mid',
          deployedAtAtm: 10,
          seconds: 20,
          deployedToMm: 3.07,
        },
      },
    ]
    expect(ptcaProcedureNarrative(p)).toContain(
      'Later a 2.75x28mm METAFOR stent was deployed to the Proximal to mid LCX at 10atm to a size of 3.07 mm.',
    )
  })

  it('joins two stent segments with and and more with commas and and', () => {
    const p = emptyProcedure('ptca-template')
    p.access = { ...p.access, site: 'radial', side: 'right' }
    p.baselineAngio = [finding({ vessel: 'RCA', stenosis: 90, isTarget: true, features: [] })]
    p.events = [
      { id: 'g1', at: 1, kind: 'guideCatheter', data: { device: 'JR', curve: '3.5', size: '6F' } },
      {
        id: 's1',
        at: 2,
        kind: 'stent',
        data: {
          name: 'METAFOR',
          type: 'DES',
          diameterMm: 3.0,
          lengthMm: 19,
          vessel: 'RCA',
          segment: ['proximal-mid', 'mid-distal'],
          deployedAtAtm: 10,
          seconds: 20,
        },
      },
    ]
    expect(ptcaProcedureNarrative(p)).toContain(
      'Later a 3.0x19mm METAFOR stent was deployed to the Proximal to mid and Mid to distal RCA at 10atm.',
    )
    p.events[1] = {
      ...p.events[1],
      data: {
        ...(p.events[1] as Extract<(typeof p.events)[number], { kind: 'stent' }>).data,
        segment: ['ostial', 'proximal-mid', 'mid-distal'],
      },
    }
    expect(ptcaProcedureNarrative(p)).toContain(
      'Later a 3.0x19mm METAFOR stent was deployed to the Ostial, Proximal to mid and Mid to distal RCA at 10atm.',
    )
  })

  it('matches the two-vessel reference procedure paragraph', () => {
    const p = emptyProcedure('ptca-template')
    p.access = { ...p.access, site: 'radial', side: 'right' }
    p.baselineAngio = [
      finding({ id: 'f1', vessel: 'OM1', stenosis: 90, isTarget: true, features: [] }),
      finding({ id: 'f2', vessel: 'LAD', stenosis: 90, isTarget: true, features: [] }),
    ]
    p.events = [
      { id: 'g1', at: 1, kind: 'guideCatheter', data: { device: 'EBU', curve: '3.5', size: '6F' } },
      {
        id: 'w1',
        at: 2,
        kind: 'guidewire',
        data: { name: 'Runthrough floppy', type: 'workhorse', vessel: 'OM1', parkedSegment: 'distal' },
      },
      {
        id: 'b1',
        at: 3,
        kind: 'predilatation',
        data: {
          name: 'Ryurei',
          type: 'semi-compliant',
          diameterMm: 2.0,
          lengthMm: 10,
          vessel: 'OM1',
          inflations: [{ atm: 10, seconds: 15 }, { atm: 12, seconds: 15 }, { atm: 14, seconds: 15 }],
        },
      },
      {
        id: 's1',
        at: 4,
        kind: 'stent',
        data: {
          name: 'Adva Pro',
          type: 'DES',
          diameterMm: 2.5,
          lengthMm: 16,
          vessel: 'OM1',
          segment: 'proximal',
          deployedAtAtm: 10,
          seconds: 20,
        },
      },
      {
        id: 'p1',
        at: 5,
        kind: 'postdilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 2.5,
          lengthMm: 12,
          vessel: 'OM1',
          inflations: [{ atm: 14, seconds: 15 }, { atm: 14, seconds: 15 }],
        },
      },
      {
        id: 'w2',
        at: 6,
        kind: 'guidewire',
        data: { name: 'Runthrough floppy', type: 'workhorse', vessel: 'LAD', parkedSegment: 'distal' },
      },
      {
        id: 'b2',
        at: 7,
        kind: 'predilatation',
        data: {
          name: 'Ryurei',
          type: 'semi-compliant',
          diameterMm: 2.0,
          lengthMm: 10,
          vessel: 'LAD',
          inflations: [{ atm: 14, seconds: 15 }, { atm: 14, seconds: 15 }, { atm: 12, seconds: 15 }],
        },
      },
      {
        id: 'b3',
        at: 8,
        kind: 'predilatation',
        data: {
          name: '',
          type: 'semi-compliant',
          diameterMm: 2.5,
          lengthMm: 16,
          vessel: 'LAD',
          inflations: [{ atm: 14, seconds: 15 }, { atm: 16, seconds: 15 }],
        },
      },
      {
        id: 's2',
        at: 9,
        kind: 'stent',
        data: {
          name: 'Tetriflex',
          type: 'DES',
          diameterMm: 2.75,
          lengthMm: 28,
          vessel: 'LAD',
          segment: 'ostioproximal',
          deployedAtAtm: 10,
          seconds: 20,
        },
      },
      {
        id: 'p2',
        at: 10,
        kind: 'postdilatation',
        data: {
          name: 'Accuforce NC',
          type: 'non-compliant',
          diameterMm: 2.75,
          lengthMm: 12,
          vessel: 'LAD',
          inflations: [
            { atm: 14, seconds: 15 },
            { atm: 16, seconds: 15 },
            { atm: 14, seconds: 15 },
            { atm: 18, seconds: 15 },
          ],
        },
      },
    ]
    expect(ptcaProcedureNarrative(p)).toBe(
      [
        [
          'Patient was taken up for PTCA with informed consent, RRA access was taken.',
          'Later LCA was cannulated with a 6F EBU 3.5 guiding Catheter.',
          'And the OM1 lesion was crossed with a 0.014" Runthrough floppy guide wire and the lesion was predilated with a 2.0x10mm Ryurei balloon at 10,12,14atm.',
          'Later a 2.5x16mm Adva Pro stent was deployed to the Proximal OM1 at 10atm.',
          'The proximal, mid, distal part of the stent was post dilated with a 2.5x12mm Accuforce NC balloon at 14,14atm.',
        ].join(' '),
        [
          'And the LAD lesion was crossed with a 0.014" Runthrough floppy guide wire and the lesion was predilated sequentially with a 2.0x10mm Ryurei balloon at 14,14,12atm and 2.5x16mm balloon at 14,16atm.',
          'Later a 2.75x28mm Tetriflex stent was deployed to the Ostial to proximal LAD at 10atm.',
          'The proximal, mid, distal part of the stent was post dilated with a 2.75x12mm Accuforce NC balloon at 14,16,14,18atm.',
          'Check shoots revealed well deployed stent with no residual stenosis, no thrombus, no dissection with good vessel flow distally.',
          'There was no procedure related complications.',
        ].join(' '),
      ].join('\n\n'),
    )
  })

  it('starts a new paragraph for each subsequent vessel, keeping check shoots on the last', () => {
    const p = emptyProcedure('ptca-template')
    p.access = { ...p.access, site: 'radial', side: 'right' }
    p.baselineAngio = [
      finding({ id: 'f1', vessel: 'LAD', stenosis: 90, isTarget: true }),
      finding({ id: 'f2', vessel: 'RCA', stenosis: 80, isTarget: true, features: [] }),
    ]
    p.events = [
      { id: 'g1', at: 1, kind: 'guideCatheter', data: { device: 'EBU', curve: '3.5', size: '6F', vessel: 'LAD' } },
      {
        id: 'w1',
        at: 2,
        kind: 'guidewire',
        data: { name: 'BMW', type: 'workhorse', vessel: 'LAD', parkedSegment: 'distal' },
      },
      {
        id: 's1',
        at: 3,
        kind: 'stent',
        data: {
          name: 'Xience',
          type: 'DES',
          diameterMm: 3,
          lengthMm: 28,
          vessel: 'LAD',
          segment: 'proximal',
          deployedAtAtm: 12,
          seconds: 20,
        },
      },
      { id: 'g2', at: 4, kind: 'guideCatheter', data: { device: 'JR', curve: '4.0', size: '6F', vessel: 'RCA' } },
      {
        id: 'w2',
        at: 5,
        kind: 'guidewire',
        data: { name: 'Sion', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' },
      },
      {
        id: 's2',
        at: 6,
        kind: 'stent',
        data: {
          name: 'Xience',
          type: 'DES',
          diameterMm: 3,
          lengthMm: 18,
          vessel: 'RCA',
          segment: 'mid',
          deployedAtAtm: 14,
          seconds: 20,
        },
      },
    ]
    const paragraphs = ptcaProcedureNarrative(p).split('\n\n')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toContain('And the LAD lesion was crossed')
    expect(paragraphs[0]).not.toContain('RCA')
    expect(paragraphs[1].startsWith('Later RCA was cannulated')).toBe(true)
    expect(paragraphs[1]).toContain('And the RCA lesion was crossed')
    expect(paragraphs[1]).toContain('Check shoots revealed')
    expect(paragraphs[0]).not.toContain('Check shoots')
  })

  it('prefers Access contrast for the report', () => {
    expect(ptcaContrastText(hameed())).toBe('100 ml Omnipaque')
  })
})
