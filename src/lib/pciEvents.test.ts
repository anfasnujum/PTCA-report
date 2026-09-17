import { describe, expect, it } from 'vitest'
import { eventsForVessel, mergeVesselReorder, vesselWorkEvents, clearVesselEvents } from '@/lib/pciEvents'
import type { ProcedureEvent } from '@/types/procedure'

const events: ProcedureEvent[] = [
  { id: 'g1', at: 1, kind: 'guideCatheter', data: { curve: 'EBU 3.5', size: '6F', coronary: 'left' } },
  { id: 'w1', at: 2, kind: 'guidewire', data: { name: 'BMW', type: 'workhorse', vessel: 'LAD', parkedSegment: 'distal' } },
  { id: 'w2', at: 3, kind: 'guidewire', data: { name: 'Sion', type: 'workhorse', vessel: 'RCA', parkedSegment: 'distal' } },
  {
    id: 's1',
    at: 4,
    kind: 'stent',
    data: {
      name: 'Xience',
      type: 'DES',
      diameterMm: 3,
      lengthMm: 24,
      vessel: 'LAD',
      deployedAtAtm: 12,
      seconds: 20,
    },
  },
]

describe('pciEvents', () => {
  it('keeps left guides with LAD work and ignores RCA wires', () => {
    expect(eventsForVessel(events, 'LAD').map((e) => e.id)).toEqual(['g1', 'w1', 's1'])
    expect(vesselWorkEvents(events, 'LAD').map((e) => e.id)).toEqual(['w1', 's1'])
    expect(vesselWorkEvents(events, 'LCX')).toEqual([])
  })

  it('reorders only the selected vessel while leaving others in place', () => {
    const next = mergeVesselReorder(events, 'LAD', ['s1', 'g1', 'w1'])
    expect(next.map((e) => e.id)).toEqual(['s1', 'g1', 'w2', 'w1'])
  })

  it('keeps a JR logged on LAD with that vessel', () => {
    const extra: ProcedureEvent = {
      id: 'g2',
      at: 5,
      kind: 'guideCatheter',
      data: { device: 'JR', curve: '3.5', size: '6F', vessel: 'LAD' },
    }
    expect(eventsForVessel([...events, extra], 'LAD').map((e) => e.id)).toEqual(['g1', 'w1', 's1', 'g2'])
    expect(eventsForVessel([...events, extra], 'RCA').map((e) => e.id)).toEqual(['w2'])
  })

  it('clears work on a vessel but keeps a shared left guide', () => {
    const tagged: ProcedureEvent = {
      id: 'g2',
      at: 5,
      kind: 'guideCatheter',
      data: { device: 'JR', curve: '3.5', size: '6F', vessel: 'LAD' },
    }
    expect(clearVesselEvents([...events, tagged], 'LAD').map((e) => e.id)).toEqual(['g1', 'w2'])
  })
})
