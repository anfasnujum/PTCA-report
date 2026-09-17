import {
  findingsForVessel,
  stenosisModeOf,
  worstFinding,
} from '@/lib/format'
import { nid } from '@/lib/ids'
import type { AngioFinding, Vessel } from '@/types/procedure'

export const DEFAULT_PCI_STENOSIS = 80

export function draftPciLesion(vessel: Vessel, stenosis = DEFAULT_PCI_STENOSIS): AngioFinding {
  return {
    id: nid(),
    vessel,
    stenosis,
    stenosisMode: 'single',
    findingType: 'stenosis',
    timiFlow: 'none',
    features: [],
    isTarget: true,
  }
}

export function pciLesionForVessel(
  findings: AngioFinding[],
  vessel: Vessel,
): AngioFinding | undefined {
  const list = findingsForVessel(findings, vessel)
  const targeted = list.find((f) => f.isTarget)
  if (targeted) return targeted
  const worst = worstFinding(list)
  if (!worst) return undefined
  if (worst.stenosis > 0 || stenosisModeOf(worst) === 'range') return worst
  return undefined
}

export function clearPciLesion(findings: AngioFinding[], vessel: Vessel): AngioFinding[] {
  const existing = pciLesionForVessel(findings, vessel)
  if (!existing) return findings
  return findings.filter((f) => f.id !== existing.id)
}

export function upsertPciLesion(
  findings: AngioFinding[],
  vessel: Vessel,
  next: Pick<AngioFinding, 'stenosis' | 'stenosisMode' | 'stenosisRange' | 'stenosisTo'> &
    Partial<Pick<AngioFinding, 'features'>>,
): AngioFinding[] {
  const existing = pciLesionForVessel(findings, vessel)
  if (!existing) {
    return [
      ...findings,
      {
        ...draftPciLesion(vessel, next.stenosis),
        ...next,
        features: next.features ?? [],
        findingType: 'stenosis',
        isTarget: true,
      },
    ]
  }
  return findings.map((f) =>
    f.id === existing.id
      ? {
          ...existing,
          ...next,
          features: next.features ?? existing.features,
          findingType: existing.findingType === 'normal' ? 'stenosis' : existing.findingType,
          isTarget: true,
        }
      : f,
  )
}
