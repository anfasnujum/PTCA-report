export const STEPS = [
  { to: 'patient', label: 'Patient', hint: 'Identity & indication' },
  { to: 'access', label: 'Access', hint: 'Sheath & site' },
  { to: 'angiogram', label: 'Angio', hint: 'Baseline findings' },
  { to: 'timeline', label: 'PCI', hint: 'Procedure timeline' },
  { to: 'result', label: 'Result', hint: 'Outcome & closure' },
  { to: 'preview', label: 'Note', hint: 'Preview & export' },
] as const
