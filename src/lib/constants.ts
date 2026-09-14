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

export const CABG_GRAFTS = ['LIMA', 'RIMA', 'SVG', 'LRA', 'RRA', 'GEA'] as const

export const PRIOR_PCI_TERRITORIES = [
  'LMCA',
  'LAD',
  'Diagonal',
  'LCX',
  'OM',
  'Ramus',
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
  { id: 'stenosis', label: 'Stenosis' },
  { id: 'lesion', label: 'Lesion' },
] as const

export const PLAQUE_GRADES = ['minor', 'mild', 'moderate', 'severe', 'other'] as const

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

export const GP2B3A = ['none', 'Tirofiban', 'Eptifibatide', 'Abciximab'] as const

export const CLOSURE_METHODS = [
  'TR band',
  'manual compression',
  'closure device',
  'sheath in situ',
] as const

export const DESTINATIONS = ['CCU', 'ICU', 'ward', 'home'] as const

export const CONDITIONS = ['stable', 'intubated', 'IABP in situ', 'on inotropes'] as const

export const GUIDE_CURVES = [
  'JL3.5',
  'JL4',
  'JR4',
  'EBU 3.0',
  'EBU 3.5',
  'EBU 3.75',
  'XB 3.5',
  'AL1',
  'AL2',
  'SAL',
] as const

export const SHEATH_SIZES = ['4F', '5F', '6F', '7F', '8F', '9F', '10F'] as const
export const GUIDE_SIZES = ['5F', '6F', '7F', '8F'] as const

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

export const BALLOON_RESULTS = [
  'lesion yields',
  'waist persists',
  'full expansion',
  'no-reflow after inflation',
] as const

export const CAG_IMPRESSIONS = [
  { id: 'normal-epicardial', label: 'Normal epicardial coronary arteries' },
  { id: 'mild-cad', label: 'Mild CAD' },
  { id: 'svd', label: 'SVD', report: 'CAD - Single vessel disease' },
  { id: 'dvd', label: 'DVD', report: 'CAD - Double vessel disease' },
  { id: 'tvd', label: 'TVD', report: 'CAD - Triple vessel disease' },
  { id: 'ectasia', label: 'Coronary artery ectasia' },
  { id: 'ectasia-slow-flow', label: 'Coronary artery ectasia with slow flow' },
] as const

export const CAG_ADVICES = [
  { id: 'omt', label: 'OMT', report: 'Optimal medical therapy' },
  { id: 'medical-management', label: 'Medical Management' },
  { id: 'ptca-lad', label: 'PTCA -> LAD', report: 'PTCA to LAD' },
  { id: 'ptca-lcx', label: 'PTCA -> LCX', report: 'PTCA to LCX' },
  { id: 'ptca-rca', label: 'PTCA -> RCA', report: 'PTCA to RCA' },
  { id: 'multi-vessel-pci', label: 'Multi Vessel PCI' },
  { id: 'emergency-cabg', label: 'Emergency CABG' },
  { id: 'early-cabg', label: 'Early CABG' },
  { id: 'early-ptca', label: 'Early PTCA' },
] as const

export const HEPARIN_PRESETS = [5000, 7500, 10000, 12500]
export const CONTRAST_PRESETS = [50, 70, 80, 90, 100, 120, 150, 200]
export const FLUORO_PRESETS = [3, 5, 6.2, 8, 10, 12, 15, 20]
