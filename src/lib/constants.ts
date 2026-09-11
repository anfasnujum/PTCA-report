export const INDICATION_CHIPS = [
  'CSA',
  'UA',
  'NSTEMI',
  'STEMI',
  'Primary PCI',
  'Rescue PCI',
  'Post-thrombolysis',
  'Staged PCI',
  'Ad-hoc PCI',
] as const

export const STEMI_TERRITORIES = ['anterior', 'inferior', 'lateral', 'posterior'] as const

export const ANGIO_FEATURES = [
  'calcified',
  'thrombotic',
  'bifurcation',
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

export const SHEATH_SIZES = ['5F', '6F', '7F', '8F'] as const

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

export const HEPARIN_PRESETS = [5000, 7500, 10000, 12500]
export const CONTRAST_PRESETS = [50, 70, 80, 90, 100, 120, 150, 200]
export const FLUORO_PRESETS = [3, 5, 6.2, 8, 10, 12, 15, 20]
