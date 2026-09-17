import { AngioBoard } from '@/components/angio/AngioBoard'
import { Button } from '@/components/ui/button'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { DOMINANCE_OPTIONS } from '@/lib/constants'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'

export function AngiogramPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  if (!current) return null

  return (
    <div className="space-y-5 pb-4">
      <p className="text-sm text-muted">
        {current.kind === 'cag'
          ? 'Tap a vessel to log plaque, stenosis or lesion. Add another issue when more than one segment is diseased.'
          : 'Tap a vessel to log plaque, stenosis or lesion. Add another issue when more than one segment is diseased. Star at least one target.'}
      </p>
      <Section title="Dominance">
        <ChipScroller>
          {DOMINANCE_OPTIONS.map((d) => (
            <Chip
              key={d}
              selected={(current.dominance ?? '') === d}
              onClick={() =>
                mutate((p) => ({
                  ...p,
                  dominance: p.dominance === d ? '' : d,
                }))
              }
            >
              {d}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <AngioBoard
        findings={current.baselineAngio}
        showTargetVessel={current.kind !== 'cag'}
        onChange={(baselineAngio) => mutate((p) => ({ ...p, baselineAngio }))}
      />
      <Button
        size="lg"
        className="w-full"
        data-enter-next
        onClick={() => navigate(`/procedure/${id}/result`)}
      >
        Next — Impression
      </Button>
    </div>
  )
}
