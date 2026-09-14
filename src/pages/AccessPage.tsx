import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ACCESS_SPECIAL_NOTES, SHEATH_SIZES } from '@/lib/constants'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import type { Access } from '@/types/procedure'

const SITES = ['radial', 'distal radial', 'ulnar', 'femoral', 'brachial'] as const

export function AccessPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  if (!current) return null

  const set = (patch: Partial<Access>) =>
    mutate((p) => ({ ...p, access: { ...p.access, ...patch } }))

  const specialNote = current.access.specialNote ?? ''

  return (
    <div className="grid gap-5 lg:grid-cols-2">
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
      <div className="lg:col-span-2">
        <Section title="Special Notes">
          <Select value={specialNote} onChange={(e) => set({ specialNote: e.target.value })}>
            <option value="">Select</option>
            {ACCESS_SPECIAL_NOTES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          {specialNote === 'Other' ? (
            <Input
              className="mt-2"
              placeholder="Enter special note"
              value={current.access.specialNoteCustom ?? ''}
              onChange={(e) => set({ specialNoteCustom: e.target.value })}
            />
          ) : null}
        </Section>
      </div>
      <Button size="lg" className="w-full lg:col-span-2" onClick={() => navigate(`/procedure/${id}/angiogram`)}>
        Next — Angiogram
      </Button>
    </div>
  )
}
