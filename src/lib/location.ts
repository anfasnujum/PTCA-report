import { defaultDiameter } from '@/lib/format'
import type { BalloonUse, Procedure, Segment, Vessel } from '@/types/procedure'

export function lastLocation(p: Procedure): { vessel: Vessel; segment?: Segment } {
  const target = p.baselineAngio.find((a) => a.isTarget) ?? p.baselineAngio[0]
  for (let i = p.events.length - 1; i >= 0; i--) {
    const e = p.events[i]
    if (e.kind === 'guidewire' || e.kind === 'imaging') {
      return { vessel: e.data.vessel, segment: target?.segment }
    }
    if (
      e.kind === 'predilatation' ||
      e.kind === 'postdilatation' ||
      e.kind === 'stent'
    ) {
      return { vessel: e.data.vessel, segment: e.data.segment }
    }
  }
  if (target) return { vessel: target.vessel, segment: target.segment }
  return { vessel: 'LAD', segment: 'proximal' }
}

export function lastStentEventId(p: Procedure, vessel?: Vessel): string | undefined {
  for (let i = p.events.length - 1; i >= 0; i--) {
    const e = p.events[i]
    if (e.kind === 'stent' && (!vessel || e.data.vessel === vessel)) return e.id
  }
  return undefined
}

export function targetVessels(p: Procedure): Vessel[] {
  return p.baselineAngio.filter((a) => a.isTarget).map((a) => a.vessel)
}

export function defaultBalloon(p: Procedure): BalloonUse {
  const loc = lastLocation(p)
  return {
    name: 'Sapphire II',
    type: 'semi-compliant',
    diameterMm: defaultDiameter(loc.vessel, loc.segment),
    lengthMm: 15,
    vessel: loc.vessel,
    segment: loc.segment,
    inflations: [{ atm: 10, seconds: 20 }],
  }
}
