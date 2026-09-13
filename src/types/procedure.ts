export type Vessel =
  | 'LMCA'
  | 'LAD'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'S1'
  | 'LCX'
  | 'OM1'
  | 'OM2'
  | 'OM3'
  | 'Ramus'
  | 'RCA'
  | 'Conus'
  | 'AM'
  | 'PDA'
  | 'PLV'

export type Segment = 'ostial' | 'proximal' | 'mid' | 'distal' | 'diffuse' | 'diffuse'
export type SegmentChoice = Segment | Segment[]

export type TimiFlow = 0 | 1 | 2 | 3

export type ProcedureStatus = 'draft' | 'finalised'

export type Patient = {
  name: string
  title: 'Mr' | 'Ms' | 'Mrs' | 'Dr' | ''
  age: number | ''
  sex: 'M' | 'F' | 'Other' | ''
  hospitalId: string
  date: string
  startTime: string
}

export type Indication = {
  chips: string[]
  stemiTerritory?: string
  symptoms: string[]
  grafts: string[]
  valveSurgeries: string[]
  stentTerritories: string[]
  pciType?: string
}

export type AccessSite = 'radial' | 'femoral' | 'brachial' | 'distal radial' | ''

export type Access = {
  site: AccessSite
  side: 'right' | 'left' | ''
  sheathSize: '5F' | '6F' | '7F' | '8F' | ''
  punctures: number
  singleAttempt: boolean
}

export type AngioFinding = {
  id: string
  vessel: Vessel
  segment?: SegmentChoice
  earlyBifurcation?: boolean
  lengthMm?: string
  stenosis: number
  timiFlow: TimiFlow
  features: string[]
  isTarget: boolean
}

export type GuideCatheter = {
  curve: string
  size: '5F' | '6F' | '7F' | '8F'
  coronary: 'left' | 'right'
}

export type Guidewire = {
  name: string
  type: 'workhorse' | 'hydrophilic' | 'CTO' | 'support'
  vessel: Vessel
  parkedSegment?: SegmentChoice
}

export type BalloonType =
  | 'semi-compliant'
  | 'non-compliant'
  | 'cutting'
  | 'scoring'
  | 'drug-coated'

export type Inflation = {
  atm: number
  seconds: number
}

export type BalloonUse = {
  name: string
  type: BalloonType
  diameterMm: number
  lengthMm: number
  vessel: Vessel
  segment?: SegmentChoice
  inflations: Inflation[]
  result?: string
}

export type StentType = 'DES' | 'BMS' | 'BVS' | 'Covered'

export type StentTechnique =
  | 'Direct stenting'
  | 'After predilatation'
  | 'Culotte'
  | 'TAP'
  | 'Mini-crush'
  | 'Kissing balloon'

export type StentUse = {
  name: string
  type: StentType
  diameterMm: number
  lengthMm: number
  vessel: Vessel
  segment?: SegmentChoice
  deployedAtAtm: number
  seconds: number
  overlapWithEventId?: string
  technique?: StentTechnique
}

export type ImagingModality = 'IVUS' | 'OCT' | 'FFR' | 'iFR'

export type ImagingUse = {
  modality: ImagingModality
  vessel: Vessel
  finding: string
}

export type AdjunctType =
  | 'Thrombus aspiration'
  | 'Rotablation'
  | 'Cutting balloon'
  | 'IABP'
  | 'Temporary pacemaker'
  | 'Other'

export type AdjunctUse = {
  type: AdjunctType
  detail: string
}

export type EventBase = {
  id: string
  at: number
}

export type ProcedureEvent =
  | (EventBase & { kind: 'guideCatheter'; data: GuideCatheter })
  | (EventBase & { kind: 'guidewire'; data: Guidewire })
  | (EventBase & { kind: 'predilatation'; data: BalloonUse })
  | (EventBase & { kind: 'stent'; data: StentUse })
  | (EventBase & { kind: 'postdilatation'; data: BalloonUse })
  | (EventBase & { kind: 'imaging'; data: ImagingUse })
  | (EventBase & { kind: 'adjunct'; data: AdjunctUse })
  | (EventBase & { kind: 'note'; data: { text: string } })

export type EventKind = ProcedureEvent['kind']

export type Outcome = {
  residualStenosis: number
  finalTimiFlow: TimiFlow
  dissection: 'none' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  noReflow: boolean
  slowFlow: boolean
  sideBranchCompromise: boolean
  complications: string[]
  comment: string
}

export type Periprocedural = {
  heparinIU: number | ''
  gp2b3a: string
  contrastAgent: string
  contrastVolumeMl: number | ''
  fluoroTimeMin: number | ''
  dap: string
}

export type Closure = {
  method: 'TR band' | 'manual compression' | 'closure device' | 'sheath in situ' | ''
  device: string
  destination: string
  condition: string
  endTime: string
}

export type Procedure = {
  id: string
  createdAt: number
  updatedAt: number
  status: ProcedureStatus
  patient: Patient
  indication: Indication
  access: Access
  dominance?: string
  baselineAngio: AngioFinding[]
  events: ProcedureEvent[]
  outcome: Outcome
  periprocedural: Periprocedural
  closure: Closure
  operators: string[]
  mainOperator: string
  assistantOperator: string
  notes: string
  noteOverride?: string
}

export type CatalogueCategory = 'balloon' | 'stent' | 'wire' | 'guide' | 'operator'

export type CatalogueItem = {
  id: string
  category: CatalogueCategory
  name: string
  meta: Record<string, string>
  lastUsedAt: number
  useCount: number
}
