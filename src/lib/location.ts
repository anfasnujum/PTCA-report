import { defaultDiameter, findingSeverity } from '@/lib/format'
import type { BalloonUse, Procedure, SegmentChoice, Vessel } from '@/types/procedure'

export function lastLocation(
  p: Procedure,
  lockedVessel?: Vessel,
): { vessel: Vessel; segment?: SegmentChoice } {
  const scoped = lockedVessel
    ? p.baselineAngio.filter((a) => a.vessel === lockedVessel)
    : p.baselineAngio
  const targets = scoped.filter((a) => a.isTarget)
  const target =
    targets.reduce<(typeof targets)[number] | undefined>((best, f) => {
      if (!best) return f
      return findingSeverity(f) > findingSeverity(best) ? f : best
    }, undefined) ?? scoped[0]
  for (let i = p.events.length - 1; i >= 0; i--) {
    const e = p.events[i]
    if (e.kind === 'guidewire' || e.kind === 'imaging') {
      if (lockedVessel && e.data.vessel !== lockedVessel) continue
      return { vessel: e.data.vessel, segment: target?.segment }
    }
    if (e.kind === 'predilatation' || e.kind === 'postdilatation' || e.kind === 'stent') {
      if (lockedVessel && e.data.vessel !== lockedVessel) continue
      return { vessel: e.data.vessel, segment: e.data.segment }
    }
  }
  if (target) return { vessel: target.vessel, segment: target.segment }
  return { vessel: lockedVessel ?? 'LAD', segment: 'proximal' }
}

export function lastStentEventId(p: Procedure, vessel?: Vessel): string | undefined {
  for (let i = p.events.length - 1; i >= 0; i--) {
    const e = p.events[i]
    if (e.kind === 'stent' && (!vessel || e.data.vessel === vessel)) return e.id
  }
  return undefined
}

export function targetVessels(p: Procedure): Vessel[] {
  return [...new Set(p.baselineAngio.filter((a) => a.isTarget).map((a) => a.vessel))]
}

export function defaultBalloon(p: Procedure, lockedVessel?: Vessel): BalloonUse {
  const loc = lastLocation(p, lockedVessel)
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
