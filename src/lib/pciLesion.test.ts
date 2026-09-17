import { describe, expect, it } from 'vitest'
import { draftPciLesion, pciLesionForVessel, upsertPciLesion, clearPciLesion } from '@/lib/pciLesion'
import type { AngioFinding } from '@/types/procedure'

function finding(over: Partial<AngioFinding> = {}): AngioFinding {
  return {
    id: 'f1',
    vessel: 'LAD',
    stenosis: 0,
    timiFlow: 'none',
    features: [],
    isTarget: false,
    ...over,
  }
}

describe('PCI vessel lesion', () => {
  it('prefers the targeted finding on that vessel', () => {
    const findings = [
      finding({ id: 'n', stenosis: 40 }),
      finding({ id: 't', stenosis: 90, isTarget: true }),
    ]
    expect(pciLesionForVessel(findings, 'LAD')?.id).toBe('t')
  })

  it('inserts a target stenosis when the vessel has none', () => {
    const next = upsertPciLesion([], 'LCX', { stenosis: 80, stenosisMode: 'single' })
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      vessel: 'LCX',
      stenosis: 80,
      isTarget: true,
      findingType: 'stenosis',
    })
  })

  it('updates stenosis on the existing target', () => {
    const existing = draftPciLesion('LAD', 80)
    const next = upsertPciLesion([existing], 'LAD', {
      stenosis: 70,
      stenosisMode: 'range',
      stenosisRange: 20,
    })
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      id: existing.id,
      stenosis: 70,
      stenosisMode: 'range',
      stenosisRange: 20,
      isTarget: true,
    })
  })

  it('keeps features when updating stenosis', () => {
    const existing = { ...draftPciLesion('LAD', 80), features: ['diffuse'] }
    const next = upsertPciLesion([existing], 'LAD', {
      stenosis: 99,
      stenosisMode: 'single',
      features: ['diffuse'],
    })
    expect(next[0]).toMatchObject({ stenosis: 99, features: ['diffuse'], isTarget: true })
  })

  it('clears the PCI lesion so the vessel is unselected', () => {
    const existing = draftPciLesion('LAD', 90)
    const other = finding({ id: 'rcx', vessel: 'RCA', stenosis: 80, isTarget: true })
    expect(clearPciLesion([existing, other], 'LAD')).toEqual([other])
  })
})
