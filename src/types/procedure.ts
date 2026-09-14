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

export type Segment =
  | 'ostial'
  | 'ostioproximal'
  | 'proximal'
  | 'proximal-mid'
  | 'mid'
  | 'mid-distal'
  | 'distal'
  | 'other'
export type SegmentChoice = Segment | Segment[]

export type TimiFlow = 0 | 1 | 2 | 3
export type FindingTimiFlow = TimiFlow | 'none'

export type ProcedureStatus = 'draft' | 'finalised'
export type ProcedureKind = 'ptca' | 'cag'
export type CagImpression =
  | 'normal-epicardial'
  | 'mild-cad'
  | 'svd'
  | 'dvd'
  | 'tvd'
  | 'ectasia'
  | 'ectasia-slow-flow'
export type CagAdvice =
  | 'omt'
  | 'medical-management'
  | 'ptca-lad'
  | 'ptca-lcx'
  | 'ptca-rca'
  | 'multi-vessel-pci'
  | 'emergency-cabg'
  | 'early-cabg'
  | 'early-ptca'

export type Patient = {
  name: string
  title: 'Mr' | 'Ms' | 'Mrs' | 'Dr' | ''
  age: number | ''
  sex: 'M' | 'F' | 'Other' | ''
  hospitalId: string
  date: string
  startTime: string
}

export type LabDetails = {
  doctorName: string
  technologist: string
  scrubNurse: string
  access: string
  catheter: string
  contrast: string
  haemodynamicData: string
  aorticPressureMmHg: string
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

export type AccessSite = 'radial' | 'distal radial' | 'ulnar' | 'femoral' | 'brachial' | ''

export type Access = {
  site: AccessSite
  side: 'right' | 'left' | ''
  sheathSize: '4F' | '5F' | '6F' | '7F' | '8F' | '9F' | '10F' | ''
  punctures: number
  singleAttempt: boolean
  specialNote: string
  specialNoteCustom: string
}

export type LmcaLengthMode = 'category' | 'mm'
export type LmcaLengthCategory = 'short' | 'long'
export type FindingType = 'normal' | 'plaque' | 'stenosis' | 'lesion'
export type PlaqueGrade = 'minor' | 'mild' | 'moderate' | 'severe' | 'other'
export type LadBranch = 'D1' | 'D2' | 'major diagonal'
export type LadInvolvement = 'bifurcation' | 'ostium'
export type LcxBranch = 'OM1' | 'OM2' | 'major OM'
export type LadVesselType = 'I' | 'II' | 'III'
export type LcxDominance = 'dominant' | 'non-dominant' | 'co-dominant'
export type RcaDominance = LcxDominance
export type RamusSize = 'good' | 'medium' | 'small'

export type AngioFinding = {
  id: string
  vessel: Vessel
  segment?: SegmentChoice
  separateOrigin?: boolean
  lengthMode?: LmcaLengthMode
  lengthMm?: string
  lengthCategory?: LmcaLengthCategory
  ladType?: LadVesselType
  ladRemarkOpen?: boolean
  ladRemark?: string
  lcxDominance?: LcxDominance
  ramusSize?: RamusSize
  rcaDominance?: RcaDominance
  rcaRemarkOpen?: boolean
  rcaRemark?: string
  findingType?: FindingType
  plaqueGrade?: PlaqueGrade
  plaqueOther?: string
  stenosis: number
  stenosisMode?: 'single' | 'range'
  stenosisTo?: number
  stenosisRange?: number
  timiFlow: FindingTimiFlow
  features: string[]
  isTarget: boolean
  distalNote?: string
  distalNoteCustom?: string
  ladBranch?: LadBranch
  ladInvolvement?: LadInvolvement
  lcxBranch?: LcxBranch
  lcxInvolvement?: LadInvolvement
  segmentOther?: string
  omMajor?: boolean
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
  kind?: ProcedureKind
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
  lab: LabDetails
  notes: string
  noteOverride?: string
  cagImpressions?: CagImpression[]
  cagCustomImpressions?: string[]
  cagAdvices?: CagAdvice[]
  cagCustomAdvices?: string[]
  cagLimaOn?: boolean
  cagLimaNote?: string
  cagRimaOn?: boolean
  cagRimaNote?: string
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
