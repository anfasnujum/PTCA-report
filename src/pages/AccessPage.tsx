import { useState } from 'react'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CatheterSheet } from '@/components/sheets/CatheterSheet'
import { ContrastSheet } from '@/components/sheets/ContrastSheet'
import { ACCESS_SPECIAL_NOTES, SHEATH_SIZES } from '@/lib/constants'
import { defaultCatheterSize, formatAorticPressureInput, formatLabAccess, parseCatheterLabel, parseContrastLabel } from '@/lib/access'
import { emptyLab } from '@/lib/seed'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import type { Access, LabDetails } from '@/types/procedure'

const SITES = ['radial', 'distal radial', 'ulnar', 'femoral', 'brachial'] as const

export function AccessPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  const [catheterOpen, setCatheterOpen] = useState(false)
  const [contrastOpen, setContrastOpen] = useState(false)
  if (!current) return null

  const lab = current.lab ?? emptyLab()

  const set = (patch: Partial<Access>) =>
    mutate((p) => {
      const access = { ...p.access, ...patch }
      if (patch.site === undefined && patch.side === undefined) {
        return { ...p, access }
      }
      return {
        ...p,
        access,
        lab: { ...(p.lab ?? emptyLab()), access: formatLabAccess(access) },
      }
    })

  const setLab = (patch: Partial<LabDetails>) =>
    mutate((p) => ({ ...p, lab: { ...(p.lab ?? emptyLab()), ...patch } }))

  const specialNote = current.access.specialNote ?? ''
  const radialLike = current.access.site === 'radial' || current.access.site === 'distal radial' || current.access.site === 'ulnar'
  const parsedCatheter = parseCatheterLabel(lab.catheter)
  const parsedContrast = parseContrastLabel(lab.contrast)

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
      {current.kind === 'cag' ? null : (
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
      )}
      <Section title="Catheter">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left shadow-card"
          onClick={() => setCatheterOpen(true)}
        >
          <span className={lab.catheter ? 'font-semibold' : 'text-muted'}>
            {lab.catheter || 'Select catheter'}
          </span>
          <span className="text-sm font-semibold text-accent">{lab.catheter ? 'Edit' : 'Choose'}</span>
        </button>
      </Section>
      <Section title="Contrast">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left shadow-card"
          onClick={() => setContrastOpen(true)}
        >
          <span className={lab.contrast ? 'font-semibold' : 'text-muted'}>
            {lab.contrast || 'Select contrast'}
          </span>
          <span className="text-sm font-semibold text-accent">{lab.contrast ? 'Edit' : 'Choose'}</span>
        </button>
      </Section>
      <Section title="Haemodynamic Data">
        <Input
          value={lab.haemodynamicData}
          placeholder="e.g. Stable"
          onChange={(e) => setLab({ haemodynamicData: e.target.value })}
        />
      </Section>
      <Section title="Aortic Pressure">
        <div className="relative">
          <Input
            value={lab.aorticPressureMmHg}
            placeholder="e.g. 120/80"
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => setLab({ aorticPressureMmHg: formatAorticPressureInput(e.target.value) })}
            className="pr-16"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
            mmHg
          </span>
        </div>
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
      <CatheterSheet
        open={catheterOpen}
        initial={{
          curve: parsedCatheter.curve || (radialLike ? 'TIG' : 'JR 4'),
          size: parsedCatheter.curve ? parsedCatheter.size : defaultCatheterSize(current.access.sheathSize),
        }}
        onClose={() => setCatheterOpen(false)}
        onSave={(catheter) => {
          setLab({ catheter })
          setCatheterOpen(false)
        }}
      />
      <ContrastSheet
        open={contrastOpen}
        initial={{
          agent: parsedContrast.agent || 'Omnipaque',
          volumeMl: parsedContrast.volumeMl === '' ? 60 : parsedContrast.volumeMl,
        }}
        onClose={() => setContrastOpen(false)}
        onSave={(contrast) => {
          setLab({ contrast })
          setContrastOpen(false)
        }}
      />
    </div>
  )
}
