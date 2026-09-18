import { useState } from 'react'
import { VesselInventory } from '@/components/pci/VesselInventory'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Section } from '@/components/ui/section'
import { LEFT_VESSELS, RIGHT_VESSELS, formatStenosis } from '@/lib/format'
import { pciLesionForVessel } from '@/lib/pciLesion'
import { vesselWorkEvents, clearVesselProcedure } from '@/lib/pciEvents'
import { isCombinedProcessPartner } from '@/lib/ptcaReport'
import { cn } from '@/lib/utils'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import type { Vessel } from '@/types/procedure'

function VesselGroup({
  label,
  vessels,
  active,
  stenosis,
  onSelect,
}: {
  label: string
  vessels: Vessel[]
  active: (vessel: Vessel) => number
  stenosis: (vessel: Vessel) => string
  onSelect: (vessel: Vessel) => void
}) {
  return (
    <Section title={label}>
      <div className="grid grid-cols-3 gap-2">
        {vessels.map((vessel) => {
          const steps = active(vessel)
          const pct = stenosis(vessel)
          return (
            <button
              key={vessel}
              type="button"
              onClick={() => onSelect(vessel)}
              className={cn(
                'min-h-16 rounded-2xl border px-2 py-2 text-center',
                steps || pct
                  ? 'border-accent bg-accent-soft text-foreground ring-2 ring-accent'
                  : 'border-border bg-card text-muted',
              )}
            >
              <div className="text-sm font-semibold text-foreground">{vessel}</div>
              <div className="text-xs opacity-80">
                {steps ? `${steps} item${steps === 1 ? '' : 's'}` : pct || 'tap'}
                {steps && pct ? ` · ${pct}` : ''}
              </div>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

export function ProceduresPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  const [openVessel, setOpenVessel] = useState<Vessel | null>(null)
  if (!current) return null

  const stepCount = (vessel: Vessel) =>
    isCombinedProcessPartner(current, vessel) ? 0 : vesselWorkEvents(current.events, vessel).length
  const stenosisLabel = (vessel: Vessel) => {
    if (isCombinedProcessPartner(current, vessel)) return ''
    const lesion = pciLesionForVessel(current.baselineAngio, vessel)
    return lesion ? formatStenosis(lesion) : ''
  }

  return (
    <div className="space-y-5 pb-4">
      <p className="text-sm text-muted">
        Tap a vessel and add the inventory used on it, in order. Treat as many vessels as needed.
      </p>
      <VesselGroup
        label="Left system"
        vessels={LEFT_VESSELS}
        active={stepCount}
        stenosis={stenosisLabel}
        onSelect={setOpenVessel}
      />
      <VesselGroup
        label="Right system"
        vessels={RIGHT_VESSELS}
        active={stepCount}
        stenosis={stenosisLabel}
        onSelect={setOpenVessel}
      />
      <Button
        size="lg"
        className="w-full"
        data-enter-next
        onClick={() => navigate(`/procedure/${id}/result`)}
      >
        Next — Result
      </Button>
      {openVessel ? (
        <BottomSheet
          open
          wide
          title={openVessel}
          onClose={() => setOpenVessel(null)}
          footer={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => mutate((p) => clearVesselProcedure(p, openVessel))}
              >
                Clear
              </Button>
              <Button size="lg" className="flex-1" onClick={() => setOpenVessel(null)}>
                Done
              </Button>
            </div>
          }
        >
          <VesselInventory vessel={openVessel} />
        </BottomSheet>
      ) : null}
    </div>
  )
}
