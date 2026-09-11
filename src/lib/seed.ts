import { nid } from '@/lib/ids'
import { nowHm, todayIso } from '@/lib/format'
import type { CatalogueItem, Procedure } from '@/types/procedure'

export function emptyProcedure(id = nid()): Procedure {
  const now = Date.now()
  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    patient: {
      name: '',
      title: 'Mr',
      age: '',
      sex: '',
      hospitalId: '',
      date: todayIso(),
      startTime: nowHm(),
    },
    indication: { chips: [] },
    access: {
      site: 'radial',
      side: 'right',
      sheathSize: '6F',
      punctures: 1,
      singleAttempt: true,
    },
    baselineAngio: [],
    events: [],
    outcome: {
      residualStenosis: 0,
      finalTimiFlow: 3,
      dissection: 'none',
      noReflow: false,
      slowFlow: false,
      sideBranchCompromise: false,
      complications: ['none'],
      comment: '',
    },
    periprocedural: {
      heparinIU: '',
      gp2b3a: 'none',
      contrastAgent: 'Iohexol',
      contrastVolumeMl: '',
      fluoroTimeMin: '',
      dap: '',
    },
    closure: {
      method: 'TR band',
      device: '',
      destination: 'CCU',
      condition: 'stable',
      endTime: '',
    },
    operators: [],
    notes: '',
  }
}

export function demoProcedure(): Procedure {
  const createdAt = new Date('2026-09-11T10:40:00').getTime()
  const guideId = 'evt-guide'
  const wireId = 'evt-wire'
  const balloonId = 'evt-balloon'
  const stentId = 'evt-stent'
  const postId = 'evt-post'
  return {
    id: 'seed-demo',
    createdAt,
    updatedAt: createdAt + 45 * 60 * 1000,
    status: 'draft',
    patient: {
      name: 'XXXX',
      title: 'Mr',
      age: 58,
      sex: 'M',
      hospitalId: '123456',
      date: '2026-09-11',
      startTime: '10:40',
    },
    indication: { chips: ['STEMI', 'Primary PCI'], stemiTerritory: 'inferior' },
    access: {
      site: 'radial',
      side: 'right',
      sheathSize: '6F',
      punctures: 1,
      singleAttempt: true,
    },
    baselineAngio: [
      {
        id: 'ang-lmca',
        vessel: 'LMCA',
        stenosis: 0,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'ang-lad',
        vessel: 'LAD',
        segment: 'mid',
        stenosis: 40,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'ang-lcx',
        vessel: 'LCX',
        stenosis: 0,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'ang-rca',
        vessel: 'RCA',
        segment: 'proximal',
        stenosis: 95,
        timiFlow: 1,
        features: ['thrombotic'],
        isTarget: true,
      },
    ],
    events: [
      {
        id: guideId,
        at: createdAt + 60_000,
        kind: 'guideCatheter',
        data: { curve: 'JR4', size: '6F', coronary: 'right' },
      },
      {
        id: wireId,
        at: createdAt + 120_000,
        kind: 'guidewire',
        data: { name: 'BMW', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' },
      },
      {
        id: balloonId,
        at: createdAt + 180_000,
        kind: 'predilatation',
        data: {
          name: 'Sapphire II',
          type: 'semi-compliant',
          diameterMm: 2.0,
          lengthMm: 15,
          vessel: 'RCA',
          segment: 'proximal',
          inflations: [
            { atm: 10, seconds: 20 },
            { atm: 12, seconds: 15 },
          ],
        },
      },
      {
        id: stentId,
        at: createdAt + 240_000,
        kind: 'stent',
        data: {
          name: 'Supraflex Cruz',
          type: 'DES',
          diameterMm: 3.5,
          lengthMm: 28,
          vessel: 'RCA',
          segment: 'proximal',
          deployedAtAtm: 14,
          seconds: 20,
          technique: 'After predilatation',
        },
      },
      {
        id: postId,
        at: createdAt + 300_000,
        kind: 'postdilatation',
        data: {
          name: 'NC Sapphire',
          type: 'non-compliant',
          diameterMm: 3.75,
          lengthMm: 12,
          vessel: 'RCA',
          segment: 'proximal',
          inflations: [{ atm: 18, seconds: 15 }],
        },
      },
    ],
    outcome: {
      residualStenosis: 0,
      finalTimiFlow: 3,
      dissection: 'none',
      noReflow: false,
      slowFlow: false,
      sideBranchCompromise: false,
      complications: ['none'],
      comment: '',
    },
    periprocedural: {
      heparinIU: 7500,
      gp2b3a: 'none',
      contrastAgent: 'Iohexol',
      contrastVolumeMl: 90,
      fluoroTimeMin: 6.2,
      dap: '',
    },
    closure: {
      method: 'TR band',
      device: '',
      destination: 'CCU',
      condition: 'stable',
      endTime: '11:25',
    },
    operators: ['Dr. A', 'Dr. B'],
    notes: '',
  }
}

export function seedCatalogue(now = Date.now()): CatalogueItem[] {
  const balloons: Array<[string, string]> = [
    ['Sapphire II', 'semi-compliant'],
    ['Emerge', 'semi-compliant'],
    ['NC Trek', 'non-compliant'],
    ['NC Sapphire', 'non-compliant'],
    ['Accuforce', 'non-compliant'],
    ['Scoreflex', 'scoring'],
    ['Wolverine', 'cutting'],
    ['Agent', 'drug-coated'],
  ]
  const stents: Array<[string, string]> = [
    ['Xience Sierra', 'DES'],
    ['Synergy', 'DES'],
    ['Ultimaster Tansei', 'DES'],
    ['Supraflex Cruz', 'DES'],
    ['BioMime', 'DES'],
    ['Resolute Onyx', 'DES'],
    ['Promus Premier', 'DES'],
    ['Orsiro', 'DES'],
  ]
  const wires: Array<[string, string]> = [
    ['BMW', 'workhorse'],
    ['Runthrough NS', 'workhorse'],
    ['Sion Blue', 'workhorse'],
    ['Whisper MS', 'hydrophilic'],
    ['Fielder XT', 'CTO'],
    ['Pilot 50', 'CTO'],
    ['Pilot 150', 'CTO'],
    ['Pilot 200', 'CTO'],
    ['Gaia First', 'CTO'],
    ['Gaia Second', 'CTO'],
  ]
  const guides: Array<[string, string]> = [
    ['JL3.5', 'left'],
    ['JL4', 'left'],
    ['JR4', 'right'],
    ['EBU 3.0', 'left'],
    ['EBU 3.5', 'left'],
    ['EBU 3.75', 'left'],
    ['XB 3.5', 'left'],
    ['AL1', 'right'],
    ['AL2', 'right'],
    ['SAL', 'right'],
  ]

  const items: CatalogueItem[] = []
  const push = (
    category: CatalogueItem['category'],
    name: string,
    meta: Record<string, string>,
    bump: number,
  ) => {
    items.push({
      id: `cat-${category}-${name.replace(/\s+/g, '-').toLowerCase()}`,
      category,
      name,
      meta,
      lastUsedAt: now - bump * 1000,
      useCount: Math.max(0, 12 - bump),
    })
  }

  balloons.forEach(([name, type], i) => push('balloon', name, { type }, i + 1))
  stents.forEach(([name, type], i) => push('stent', name, { type }, i + 1))
  wires.forEach(([name, type], i) => push('wire', name, { type }, i + 1))
  guides.forEach(([name, coronary], i) => push('guide', name, { coronary }, i + 1))
  return items
}
