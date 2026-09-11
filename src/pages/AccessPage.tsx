import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { SHEATH_SIZES } from '@/lib/constants'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import type { Access } from '@/types/procedure'

const SITES = ['radial', 'distal radial', 'femoral', 'brachial'] as const

export function AccessPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  if (!current) return null

  const set = (patch: Partial<Access>) =>
    mutate((p) => ({ ...p, access: { ...p.access, ...patch } }))

  return (
    <div className="space-y-5">
      <Section title="Site">
        <ChipScroller>
          {SITES.map((s) => (
            <Chip key={s} selected={current.access.site === s} onClick={() => set({ site: s })}>
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Side">
        <ChipScroller>
          {(['right', 'left'] as const).map((s) => (
            <Chip key={s} selected={current.access.side === s} onClick={() => set({ side: s })}>
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Sheath">
        <ChipScroller>
          {SHEATH_SIZES.map((s) => (
            <Chip
              key={s}
              selected={current.access.sheathSize === s}
              onClick={() => set({ sheathSize: s })}
            >
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Switch
        label="Single attempt"
        checked={current.access.singleAttempt}
        onChange={(singleAttempt) =>
          set({ singleAttempt, punctures: singleAttempt ? 1 : Math.max(2, current.access.punctures) })
        }
      />
      {!current.access.singleAttempt ? (
        <Section title="Punctures">
          <NumberChips
            values={[2, 3, 4, 5]}
            value={current.access.punctures}
            onChange={(punctures) => set({ punctures })}
          />
        </Section>
      ) : null}
      <Button size="lg" className="w-full" onClick={() => navigate(`/procedure/${id}/angiogram`)}>
        Next — Angiogram
      </Button>
    </div>
  )
}
