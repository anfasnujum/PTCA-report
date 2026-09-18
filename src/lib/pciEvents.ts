import { isRightCoronary } from '@/lib/format'
import { coronaryFromDevice, normalizeGuideCatheter } from '@/lib/guideCatheter'
import { clearPciLesion } from '@/lib/pciLesion'
import type { Procedure, ProcedureEvent, Vessel } from '@/types/procedure'

export function eventBelongsToVessel(event: ProcedureEvent, vessel: Vessel): boolean {
  switch (event.kind) {
    case 'guideCatheter': {
      const guide = normalizeGuideCatheter(event.data)
      if (guide.vessel) return guide.vessel === vessel
      return coronaryFromDevice(guide.device || '') === (isRightCoronary(vessel) ? 'right' : 'left')
    }
    case 'thrombusAspiration':
    case 'microcatheter':
    case 'guideExtension':
    case 'guidewire':
    case 'predilatation':
    case 'postdilatation':
    case 'stent':
    case 'lmcaPot':
    case 'imaging':
      return event.data.vessel === vessel
    default:
      return false
  }
}

export function eventsForVessel(events: ProcedureEvent[], vessel: Vessel): ProcedureEvent[] {
  return events.filter((event) => eventBelongsToVessel(event, vessel))
}

export function vesselWorkEvents(events: ProcedureEvent[], vessel: Vessel): ProcedureEvent[] {
  return eventsForVessel(events, vessel).filter((event) => event.kind !== 'guideCatheter')
}

export function clearVesselEvents(events: ProcedureEvent[], vessel: Vessel): ProcedureEvent[] {
  return events.filter((event) => {
    if (event.kind === 'guideCatheter') {
      const guide = normalizeGuideCatheter(event.data)
      return guide.vessel !== vessel
    }
    return !eventBelongsToVessel(event, vessel)
  })
}

export function clearVesselProcedure(procedure: Procedure, vessel: Vessel): Procedure {
  const vesselPciKind = { ...procedure.vesselPciKind }
  delete vesselPciKind[vessel]
  const vesselCombined = { ...procedure.vesselCombined }
  delete vesselCombined[vessel]
  for (const host of Object.keys(vesselCombined) as Vessel[]) {
    const spec = vesselCombined[host]
    if (!spec) continue
    vesselCombined[host] = {
      ...spec,
      vessels: spec.vessels.filter((item) => item !== vessel),
    }
  }
  return {
    ...procedure,
    events: clearVesselEvents(procedure.events, vessel),
    baselineAngio: clearPciLesion(procedure.baselineAngio, vessel),
    vesselPciKind,
    vesselCombined,
  }
}

export function mergeVesselReorder(
  events: ProcedureEvent[],
  vessel: Vessel,
  orderedIds: string[],
): ProcedureEvent[] {
  const queue = [...orderedIds]
  return events.map((event) => {
    if (!eventBelongsToVessel(event, vessel)) return event
    const nextId = queue.shift()
    return events.find((item) => item.id === nextId) ?? event
  })
}
