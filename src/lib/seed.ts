import { nid } from '@/lib/ids'
import { nowHm, todayIso } from '@/lib/format'
import type { CatalogueItem, LabDetails, Procedure, ProcedureKind } from '@/types/procedure'

export function emptyLab(): LabDetails {
  return {
    doctorName: '',
    technologist: '',
    technologists: [],
    scrubNurse: '',
    access: '',
    catheter: '',
    contrast: '',
    haemodynamicData: '',
    aorticPressureMmHg: '',
    inventory: '',
    lvedp: '',
  }
}

export function emptyProcedure(id = nid(), kind: ProcedureKind = 'ptca'): Procedure {
  const now = Date.now()
  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    kind,
    patient: {
      name: '',
      title: '',
      age: '',
      sex: '',
      hospitalId: '',
      ipNo: '',
      date: todayIso(),
      startTime: nowHm(),
      cagProcedure: kind === 'cag' ? 'cag' : undefined,
    },
    indication: { chips: [], symptoms: [], grafts: [], valveSurgeries: [], stentTerritories: [] },
    access: {
      site: 'radial',
      side: 'right',
      sheathSize: '6F',
      punctures: 1,
      singleAttempt: true,
      specialNote: '',
      specialNoteCustom: '',
    },
    dominance: '',
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
    mainOperator: '',
    assistantOperator: '',
    lab: emptyLab(),
    notes: '',
    cagImpressions: [],
    cagCustomImpressions: [],
    cagAdvices: [],
    cagCustomAdvices: [],
    cagLimaOn: false,
    cagLimaNote: '',
    cagRimaOn: false,
    cagRimaNote: '',
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
    kind: 'ptca',
    patient: {
      name: 'XXXX',
      title: 'Mr',
      age: 58,
      sex: 'M',
      hospitalId: '123456',
      ipNo: '',
      date: '2026-09-11',
      startTime: '10:40',
    },
    indication: {
      chips: ['STEMI'],
      stemiTerritory: 'inferior',
      symptoms: ['Chest Pain', 'Dyspnea'],
      grafts: [],
      valveSurgeries: [],
      stentTerritories: [],
      pciType: 'Primary',
    },
    access: {
      site: 'radial',
      side: 'right',
      sheathSize: '6F',
      punctures: 1,
      singleAttempt: true,
      specialNote: '',
      specialNoteCustom: '',
    },
    dominance: 'Right',
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
        data: { device: 'JR', curve: '4.0', size: '6F' },
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
    mainOperator: 'Dr. A',
    assistantOperator: 'Dr. B',
    lab: emptyLab(),
    notes: '',
  }
}

export function demoCagProcedure(): Procedure {
  const createdAt = new Date('2026-09-12T09:15:00').getTime()
  return {
    id: 'seed-demo-cag',
    createdAt,
    updatedAt: createdAt + 20 * 60 * 1000,
    status: 'draft',
    kind: 'cag',
    patient: {
      name: 'YYYY',
      title: 'Mrs',
      age: 62,
      sex: 'F',
      hospitalId: '654321',
      ipNo: '98765',
      date: '2026-09-12',
      startTime: '09:15',
    },
    indication: {
      chips: ['CSA'],
      symptoms: ['Chest Pain', 'Dyspnea on Exertion'],
      grafts: [],
      valveSurgeries: [],
      stentTerritories: [],
    },
    access: {
      site: 'radial',
      side: 'right',
      sheathSize: '5F',
      punctures: 1,
      singleAttempt: true,
      specialNote: '',
      specialNoteCustom: '',
    },
    dominance: 'Right',
    baselineAngio: [
      {
        id: 'cag-lmca',
        vessel: 'LMCA',
        findingType: 'normal',
        lengthMode: 'category',
        lengthCategory: 'short',
        stenosis: 0,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'cag-lad',
        vessel: 'LAD',
        segment: 'proximal',
        ladType: 'II',
        findingType: 'stenosis',
        plaqueGrade: 'severe',
        stenosis: 70,
        features: ['calcific', 'irregular'],
        timiFlow: 2,
        isTarget: true,
      },
      {
        id: 'cag-d1',
        vessel: 'D1',
        findingType: 'normal',
        stenosis: 0,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'cag-lcx',
        vessel: 'LCX',
        lcxDominance: 'non-dominant',
        findingType: 'normal',
        stenosis: 0,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'cag-om1',
        vessel: 'OM1',
        findingType: 'normal',
        stenosis: 0,
        timiFlow: 3,
        features: [],
        isTarget: false,
      },
      {
        id: 'cag-rca',
        vessel: 'RCA',
        rcaDominance: 'dominant',
        segment: 'mid',
        findingType: 'plaque',
        plaqueGrade: 'minor',
        stenosis: 20,
        features: ['discrete'],
        timiFlow: 3,
        isTarget: false,
      },
    ],
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
      contrastVolumeMl: 60,
      fluoroTimeMin: 3.5,
      dap: '',
    },
    closure: {
      method: 'TR band',
      device: '',
      destination: 'Ward',
      condition: 'stable',
      endTime: '09:45',
    },
    operators: ['Dr. Santhosh Narayanan'],
    mainOperator: 'Dr. Santhosh Narayanan',
    assistantOperator: '',
    lab: {
      doctorName: 'Dr. Santhosh Narayanan MD, DNB, DM (Cardiology)',
      technologist: 'Ramesh Kumar',
      scrubNurse: 'Anitha Joseph',
      access: 'RRA',
      catheter: '5F TIG',
      contrast: '60 ml Omnipaque',
      haemodynamicData: 'Stable',
      aorticPressureMmHg: '128/76',
      inventory: '',
      lvedp: '12',
    },
    notes: '',
    cagImpressions: ['svd'],
    cagCustomImpressions: [],
    cagAdvices: ['ptca-lad'],
    cagCustomAdvices: [],
    cagLimaOn: false,
    cagLimaNote: '',
    cagRimaOn: false,
    cagRimaNote: '',
  }
}

export function seedCatalogue(now = Date.now()): CatalogueItem[] {
  const balloons: Array<[string, string]> = [
    ['Sapphire II', 'semi-compliant'],
    ['Emerge', 'semi-compliant'],
    ['NC Trek', 'non-compliant'],
    ['NC Sapphire', 'non-compliant'],
    ['AperiNC', 'non-compliant'],
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
    ['METAFOR', 'DES'],
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
  const guides = ['JL', 'JR', 'EBU', 'XB', 'AL', 'AR', 'SAL', 'IM', 'MP']
  const aspirations = ['Export', 'Eliminate', 'Thrombuster', 'Pronto', 'Hunter']
  const microcatheters = ['Finecross', 'Corsair', 'Caravel', 'Turnpike', 'Mamba']
  const guideExtensions = ['GuideLiner', 'Guidezilla', 'TrapLiner', 'Telescope']

  const catheters: Array<[string, string]> = [
    ['TIG', '5F'],
    ['JL 3.5', '5F'],
    ['JL 4', '5F'],
    ['JR 4', '5F'],
    ['AR 1', '5F'],
    ['AL 1', '5F'],
    ['IM', '5F'],
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
  guides.forEach((name, i) => push('guide', name, {}, i + 1))
  aspirations.forEach((name, i) => push('aspiration', name, {}, i + 1))
  microcatheters.forEach((name, i) => push('microcatheter', name, {}, i + 1))
  guideExtensions.forEach((name, i) => push('guideExtension', name, {}, i + 1))
  catheters.forEach(([name, size], i) => push('catheter', name, { size }, i + 1))
  ;['Dr. A', 'Dr. B'].forEach((name, i) => push('operator', name, {}, i + 1))
  return items
}

export function seedOperators(now = Date.now()): CatalogueItem[] {
  return ['Dr. A', 'Dr. B'].map((name, i) => ({
    id: `cat-operator-${name.replace(/\s+/g, '-').toLowerCase()}`,
    category: 'operator' as const,
    name,
    meta: {},
    lastUsedAt: now - (i + 1) * 1000,
    useCount: Math.max(0, 12 - (i + 1)),
  }))
}

export function seedCatheters(now = Date.now()): CatalogueItem[] {
  return (
    [
      ['TIG', '5F'],
      ['JL 3.5', '5F'],
      ['JL 4', '5F'],
      ['JR 4', '5F'],
      ['AR 1', '5F'],
      ['AL 1', '5F'],
      ['IM', '5F'],
    ] as const
  ).map(([name, size], i) => ({
    id: `cat-catheter-${name.replace(/\s+/g, '-').toLowerCase()}`,
    category: 'catheter' as const,
    name,
    meta: { size },
    lastUsedAt: now - (i + 1) * 1000,
    useCount: Math.max(0, 12 - (i + 1)),
  }))
}
