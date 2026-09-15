import type { ProcedureKind } from '@/types/procedure'

export type ProcedureStep = {
  to: string
  label: string
  hint: string
}

export const PTCA_STEPS: ProcedureStep[] = [
  { to: 'patient', label: 'Patient', hint: 'Identity & indication' },
  { to: 'access', label: 'Access', hint: 'Sheath, catheter & contrast' },
  { to: 'angiogram', label: 'Angio', hint: 'Baseline findings' },
  { to: 'timeline', label: 'PCI', hint: 'Procedure timeline' },
  { to: 'result', label: 'Result', hint: 'Outcome & closure' },
  { to: 'preview', label: 'Final', hint: 'Preview & export' },
]

export const CAG_STEPS: ProcedureStep[] = [
  { to: 'patient', label: 'Patient', hint: 'Identity & indication' },
  { to: 'access', label: 'Access', hint: 'Sheath, catheter & contrast' },
  { to: 'angiogram', label: 'Angio', hint: 'Baseline findings' },
  { to: 'result', label: 'Impression', hint: 'Summary' },
  { to: 'preview', label: 'Final', hint: 'Preview & export' },
]

export function stepsFor(kind?: ProcedureKind): ProcedureStep[] {
  return kind === 'cag' ? CAG_STEPS : PTCA_STEPS
}
