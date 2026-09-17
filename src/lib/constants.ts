export const INDICATION_CHIPS = [
  'CSA',
  'UA',
  'NSTEMI',
  'STEMI',
  'Pre-op Evaluation',
  'Post-CABG',
  'Post-PCI',
  'TMT+',
  'Stress Echo',
  'Arrhythmia',
] as const

export const STEMI_TERRITORIES = [
  'anterior',
  'anteroseptal',
  'anterolateral',
  'extensive anterior',
  'inferior',
  'inferolateral',
  'inferoposterior',
  'posterior',
  'posterolateral',
  'lateral',
  'high lateral',
  'RV',
] as const

export const CAG_PROCEDURE_TYPES = [
  { id: 'cag', label: 'CAG' },
  { id: 'primary-cag', label: 'Primary CAG' },
] as const

export const PCI_TYPES = [
  'Primary',
  'Planned',
  'Rescue',
  'Elective',
  'Urgent',
  'Adhoc',
  'Staged',
  'Facilitated',
] as const

export const CONSULTANTS = [
  'Dr. Prasanth. S. MD, DM (Cardiology)',
  'Dr. Santhosh Narayanan MD, DNB, DM (Cardiology)',
  'Dr. Hariprasad.I DNB (Medicine), DrNB(Cardiology)',
  'Dr. Kader Muneer. S. MD, DM (Cardiology)',
] as const

export function matchConsultant(name: string): (typeof CONSULTANTS)[number] | '' {
  const trimmed = name.trim()
  const spaced = trimmed.replace(/,([^\s])/g, ', $1')
  return CONSULTANTS.find((c) => c === trimmed || c === spaced) ?? ''
}

export const CABG_GRAFTS = ['LIMA', 'RIMA', 'SVG', 'LRA', 'RRA', 'GEA'] as const

export const PRIOR_PCI_TERRITORIES = [
  'LMCA',
  'LAD',
  'Diagonal',
  'LCX',
  'OM',
  'Ramus',
  'LPDA',
  'RCA',
  'PDA',
  'PLV',
] as const

export const VALVE_SURGERIES = [
  'MVR',
  'AVR',
  'TVR',
  'PVR',
  'DVR',
  'MV repair',
  'AV repair',
  'TV repair',
] as const

export const SYMPTOM_CHIPS = [
  'Chest Pain',
  'Dyspnea',
  'Palpitation',
  'Fatigue',
  'Syncope',
] as const

export const DOMINANCE_OPTIONS = [
  'Right',
  'Left',
  'Codominant',
  'Super-dominant right',
  'Super-dominant left',
] as const

export const FINDING_TYPES = [
  { id: 'normal', label: 'Normal' },
  { id: 'plaque', label: 'Plaques' },
  { id: 'mildly-ectatic-vessel', label: 'Mildly ectatic vessel' },
  { id: 'dissection', label: 'Dissection' },
  { id: 'stenosis', label: 'Stenosis' },
  { id: 'lesion', label: 'Lesion' },
  { id: 'total-occlusion', label: 'Total Occlusion' },
  { id: 'myocardial-bridging', label: 'Myocardial Bridging' },
  { id: 'other', label: 'Other' },
] as const

export const PLAQUE_GRADES = ['minor', 'mild', 'moderate', 'severe', 'other'] as const
export const BRIDGING_GRADES = ['mild', 'moderate', 'severe'] as const

export const ANGIO_FEATURES = [
  'discrete',
  'tubular',
  'diffuse',
  'calcific',
  'ulcerated',
  'hazy',
  'irregular',
  'calcified',
  'thrombotic',
  'tortuous',
  'CTO',
  'ectatic',
  'slow-flow',
  'slow-flow-distal',
] as const

export const COMPLICATION_CHIPS = [
  'none',
  'dissection',
  'perforation',
  'tamponade',
  'no-reflow',
  'slow-flow',
  'arrhythmia',
  'side-branch loss',
  'thrombus',
  'access-site bleeding',
  'emergency CABG',
] as const

export const CONTRAST_AGENTS = ['Iohexol', 'Iodixanol', 'Iopromide', 'Ioversol'] as const

export const ANGIO_CONTRAST_AGENTS = [
  'Omnipaque',
  'Visipaque',
  'Xenetix',
  'Ultravist',
  'Iomeron',
  'Optiray',
  'Iopamiro',
  'Isovue',
  'Glandvida',
] as const

export const ANGIO_CONTRAST_VOLUMES = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200] as const

export const GP2B3A = ['none', 'Tirofiban', 'Eptifibatide', 'Abciximab'] as const

export const CLOSURE_METHODS = [
  'TR band',
  'manual compression',
  'closure device',
  'sheath in situ',
] as const

export const DESTINATIONS = ['CCU', 'ICU', 'ward', 'home'] as const

export const CONDITIONS = ['stable', 'intubated', 'IABP in situ', 'on inotropes'] as const

export const GUIDE_DEVICES = ['JL', 'JR', 'EBU', 'XB', 'AL', 'AR', 'SAL', 'IM', 'MP'] as const
export type GuideDevice = (typeof GUIDE_DEVICES)[number]

export const GUIDE_DEVICE_CURVES: Record<GuideDevice, readonly string[]> = {
  JL: ['3.0', '3.5', '4.0', '4.5', '5.0'],
  JR: ['3.0', '3.5', '4.0', '4.5', '5.0'],
  EBU: ['3.0', '3.5', '3.75', '4.0'],
  XB: ['3.0', '3.5', '3.75', '4.0'],
  AL: ['1', '2', '3'],
  AR: ['1', '2'],
  SAL: [],
  IM: [],
  MP: ['A1', 'A2', 'B1', 'B2'],
}

export const GUIDE_FALLBACK_CURVES = ['3.0', '3.5', '4.0', '4.5'] as const

export const SHEATH_SIZES = ['4F', '5F', '6F', '7F', '8F', '9F', '10F'] as const
export const RADIAL_SHEATHS = ['Radifocus Terumo', 'Glidesheath Slender', 'Prelude Ease'] as const
export const FEMORAL_SHEATHS = ['Radifocus Terumo', 'Avanti+', 'Input', 'Terumo Introducer'] as const
export const GUIDE_SIZES = ['5F', '6F', '7F', '8F'] as const

export const ASPIRATION_CATHETERS = ['Export', 'Eliminate', 'Thrombuster', 'Pronto', 'Hunter'] as const
export const MICROCATHETERS = ['Finecross', 'Corsair', 'Caravel', 'Turnpike', 'Mamba'] as const
export const GUIDE_EXTENSIONS = ['GuideLiner', 'Guidezilla', 'TrapLiner', 'Telescope'] as const

export const ASPIRATION_SIZES: Record<(typeof ASPIRATION_CATHETERS)[number], readonly string[]> = {
  Export: ['6F', '7F'],
  Eliminate: ['6F', '7F', '8F'],
  Thrombuster: ['6F', '7F'],
  Pronto: ['6F', '5.5F', '7F', '8F'],
  Hunter: ['6F'],
}

export const ASPIRATION_FALLBACK_SIZES = ['5.5F', '6F', '7F', '8F'] as const

/** Published French ODs (tip / distal shaft / proximal) for each seeded microcatheter. */
export const MICROCATHETER_SIZES: Record<(typeof MICROCATHETERS)[number], readonly string[]> = {
  Finecross: ['1.8F', '2.6F'],
  Corsair: ['1.3F', '2.1F', '2.6F', '2.8F', '2.9F'],
  Caravel: ['1.4F', '1.9F', '2.6F'],
  Turnpike: ['1.6F', '2.1F', '2.2F', '2.6F', '2.9F'],
  Mamba: ['1.4F', '2.1F', '2.4F', '2.9F'],
}

export const MICROCATHETER_FALLBACK_SIZES = [
  '1.3F',
  '1.4F',
  '1.5F',
  '1.6F',
  '1.7F',
  '1.8F',
  '1.9F',
  '2.1F',
  '2.2F',
  '2.4F',
  '2.5F',
  '2.6F',
  '2.8F',
  '2.9F',
] as const

export const GUIDE_EXTENSION_SIZES: Record<(typeof GUIDE_EXTENSIONS)[number], readonly string[]> = {
  GuideLiner: ['6F', '5F', '5.5F', '7F', '8F'],
  Guidezilla: ['6F', '6F Long', '7F', '8F'],
  TrapLiner: ['6F', '7F', '8F'],
  Telescope: ['6F', '7F'],
}

export const GUIDE_EXTENSION_FALLBACK_SIZES = ['5F', '5.5F', '6F', '7F', '8F'] as const

function sizesForListed<T extends string>(
  list: readonly T[],
  map: Record<T, readonly string[]>,
  fallback: readonly string[],
  name: string,
): readonly string[] {
  const key = list.find((item) => item.toLowerCase() === name.trim().toLowerCase())
  return key ? map[key] : fallback
}

export function sizesForAspiration(name: string): readonly string[] {
  return sizesForListed(ASPIRATION_CATHETERS, ASPIRATION_SIZES, ASPIRATION_FALLBACK_SIZES, name)
}

export function sizesForMicrocatheter(name: string): readonly string[] {
  return sizesForListed(MICROCATHETERS, MICROCATHETER_SIZES, MICROCATHETER_FALLBACK_SIZES, name)
}

export function sizesForGuideExtension(name: string): readonly string[] {
  return sizesForListed(GUIDE_EXTENSIONS, GUIDE_EXTENSION_SIZES, GUIDE_EXTENSION_FALLBACK_SIZES, name)
}

export function defaultAspirationSize(name: string): string {
  return sizesForAspiration(name)[0] ?? '6F'
}

export function defaultMicrocatheterSize(name: string): string {
  return sizesForMicrocatheter(name)[0] ?? '1.8F'
}

export function defaultGuideExtensionSize(name: string): string {
  return sizesForGuideExtension(name)[0] ?? '6F'
}

export function normalizeFrenchSize(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/long/i.test(t)) {
    const core = t.replace(/long/i, '').replace(/fr?/gi, '').trim() || '6'
    return `${core}F Long`
  }
  const m = t.match(/^(\d+(?:\.\d+)?)\s*f?r?$/i)
  if (m) return `${m[1]}F`
  return t
}

export const CATHETER_CURVES = [
  'TIG',
  'JL 3.5',
  'JL 4',
  'JR 3.5',
  'JR 4',
  'AR 1',
  'AR 2',
  'AL 1',
  'AL 2',
  'IM',
  '3DRC',
] as const

export const CATHETER_SIZES = ['4F', '5F', '6F'] as const

export const DISTAL_SEGMENT_NOTES = [
  'Involving LAD ostium',
  'Involving LCX ostium',
  'Involving the bifurcation of LAD and LCX',
  'Other',
] as const

export const RCA_DISTAL_NOTES = [
  'Involving the bifurcation of PDA and PLV',
  'Involving PDA ostium',
  'Involving PLV ostium',
  'Other',
] as const

export const LAD_BRANCH_NOTE_SEGMENTS = [
  'ostioproximal',
  'proximal',
  'proximal-mid',
  'mid',
] as const

export const LAD_BRANCHES = [
  { id: 'D1', label: 'D1' },
  { id: 'D2', label: 'D2' },
  { id: 'major diagonal', label: 'Major diagonal' },
] as const

export const LAD_INVOLVEMENTS = [
  { id: 'bifurcation', label: 'involving the bifurcation of' },
  { id: 'ostium', label: 'involving ostium' },
] as const

export const LCX_BRANCHES = [
  { id: 'OM1', label: 'OM1' },
  { id: 'OM2', label: 'OM2' },
  { id: 'major OM', label: 'Major OM' },
] as const

export const LAD_VESSEL_TYPES = ['I', 'II', 'III'] as const

export const LCX_DOMINANCE = [
  { id: 'dominant', label: 'Dominant' },
  { id: 'non-dominant', label: 'Non Dominant' },
  { id: 'co-dominant', label: 'Co-dominant' },
] as const

export const RCA_DOMINANCE = LCX_DOMINANCE

export const RAMUS_SIZES = [
  { id: 'good', label: 'Good sized vessel' },
  { id: 'medium', label: 'Medium sized vessel' },
  { id: 'small', label: 'Small sized vessels' },
] as const

export const ACCESS_SPECIAL_NOTES = [
  'Radial artery calcification',
  'Radial artery tortuosity',
  'Radial loop',
  'Subclavian artery tortuosity',
  'Subclavian loop',
  'Other',
] as const

export const BALLOON_TYPES = [
  'semi-compliant',
  'non-compliant',
  'cutting',
  'scoring',
  'drug-coated',
] as const

export const STENT_TYPES = ['DES', 'BMS', 'BVS', 'Covered'] as const

export const STENT_TECHNIQUES = [
  'Direct stenting',
  'After predilatation',
  'Culotte',
  'TAP',
  'Mini-crush',
  'Kissing balloon',
] as const

export const IMAGING_MODALITIES = ['IVUS', 'OCT', 'FFR', 'iFR'] as const

export const IMAGING_FINDINGS = [
  'well expanded and apposed',
  'underexpansion',
  'malapposition',
  'edge dissection',
  'adequate MLA',
  'significant ischaemia',
  'deferred',
] as const

export const ADJUNCT_TYPES = [
  'Thrombus aspiration',
  'Rotablation',
  'Cutting balloon',
  'IABP',
  'Temporary pacemaker',
  'Other',
] as const

export const WIRE_TYPES = ['workhorse', 'hydrophilic', 'CTO', 'support'] as const
export const WIRE_SIZES = ['0.014"', '0.010"', '0.018"', '0.025"', '0.035"'] as const
export const DEFAULT_WIRE_SIZE = '0.014"'

export function normalizeWireSize(raw: string): string {
  const t = raw.trim().replace(/[”″]/g, '"')
  if (!t) return ''
  const m = t.match(/^(\d+(?:\.\d+)?)\s*"?$/)
  if (m) return `${m[1]}"`
  return t
}

export function wireSizeOf(size?: string): string {
  return size?.trim() || DEFAULT_WIRE_SIZE
}

export const BALLOON_RESULTS = [
  'lesion yields',
  'waist persists',
  'full expansion',
  'no-reflow after inflation',
] as const

export const CAG_IMPRESSIONS = [
  { id: 'normal-epicardial', label: 'Normal epicardial coronary arteries' },
  { id: 'mild-cad', label: 'Mild CAD' },
  { id: 'svd', label: 'SVD', report: 'CAD - Single Vessel Disease' },
  { id: 'dvd', label: 'DVD', report: 'CAD - Double Vessel Disease' },
  { id: 'tvd', label: 'TVD', report: 'CAD - Triple Vessel Disease' },
  { id: 'lm-svd', label: 'LM + SVD', report: 'LM + Single Vessel Disease' },
  { id: 'lm-dvd', label: 'LM + DVD', report: 'LM + Double Vessel Disease' },
  { id: 'lm-tvd', label: 'LM + TVD', report: 'LM + Triple Vessel Disease' },
  { id: 'ectasia', label: 'Coronary artery ectasia' },
  { id: 'ectasia-slow-flow', label: 'Coronary artery ectasia with slow flow' },
] as const

export const CAG_ADVICES = [
  { id: 'omt', label: 'OMT' },
  { id: 'medical-management', label: 'Medical Management' },
  { id: 'primary-ptca-lad', label: 'PRIMARY PTCA → LAD' },
  { id: 'ptca-lad', label: 'PTCA → LAD', report: 'PTCA to LAD' },
  { id: 'ptca-lcx', label: 'PTCA → LCX', report: 'PTCA to LCX' },
  { id: 'ptca-rca', label: 'PTCA → RCA', report: 'PTCA to RCA' },
  { id: 'multi-vessel-pci', label: 'Multi Vessel PCI' },
  { id: 'emergency-cabg', label: 'Emergency CABG' },
  { id: 'early-cabg', label: 'Early CABG' },
  { id: 'early-ptca', label: 'Early PTCA' },
] as const

export const HEPARIN_PRESETS = [5000, 7000, 7500, 10000, 12500]
export const CONTRAST_PRESETS = [50, 70, 80, 90, 100, 120, 150, 200]
export const FLUORO_PRESETS = [3, 5, 6.2, 8, 10, 12, 15, 20]
