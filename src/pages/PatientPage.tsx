import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CABG_GRAFTS, INDICATION_CHIPS, PCI_TYPES, PRIOR_PCI_TERRITORIES, STEMI_TERRITORIES, SYMPTOM_CHIPS, VALVE_SURGERIES } from '@/lib/constants'
import { emptyLab } from '@/lib/seed'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useCatalogueStore } from '@/store/useCatalogueStore'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import type { LabDetails, Patient } from '@/types/procedure'

export function PatientPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  const [opDraft, setOpDraft] = useState('')
  const doctorItems = useCatalogueStore((s) => s.items)
  const addCustom = useCatalogueStore((s) => s.addCustom)
  const remember = useCatalogueStore((s) => s.remember)
  const doctors = doctorItems
    .filter((i) => i.category === 'operator')
    .slice()
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt || a.name.localeCompare(b.name))

  if (!current) return null

  const setPatient = (patch: Partial<Patient>) =>
    mutate((p) => ({ ...p, patient: { ...p.patient, ...patch } }))

  const setLab = (patch: Partial<LabDetails>) =>
    mutate((p) => ({ ...p, lab: { ...(p.lab ?? emptyLab()), ...patch } }))

  const lab = current.lab ?? emptyLab()

  const setDoctors = (mainOperator: string, assistantOperator: string) => {
    mutate((p) => ({
      ...p,
      mainOperator,
      assistantOperator,
      operators: [mainOperator, assistantOperator].filter(Boolean),
    }))
  }

  const toggleChip = (chip: string) => {
    mutate((p) => {
      const chips = p.indication.chips[0] === chip ? [] : [chip]
      const stemiTerritory = chips.includes('STEMI') ? p.indication.stemiTerritory : undefined
      const grafts = chips.includes('Post-CABG') ? (p.indication.grafts ?? []) : []
      const valveSurgeries = chips.includes('Pre-op Evaluation')
        ? (p.indication.valveSurgeries ?? [])
        : []
      const stentTerritories = chips.includes('Post-PCI')
        ? (p.indication.stentTerritories ?? [])
        : []
      return {
        ...p,
        indication: { ...p.indication, chips, stemiTerritory, grafts, valveSurgeries, stentTerritories },
      }
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Title">
        <ChipScroller>
          {(['Mr', 'Ms', 'Mrs', 'Dr'] as const).map((t) => (
            <Chip
              key={t}
              selected={current.patient.title === t}
              onClick={() => setPatient({ title: t })}
            >
              {t}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Name">
        <Input
          value={current.patient.name}
          placeholder="Patient name"
          onChange={(e) => setPatient({ name: e.target.value })}
        />
      </Section>
      <Section title="Cath no.">
        <Input
          value={current.patient.hospitalId}
          placeholder="Cath number"
          onChange={(e) => setPatient({ hospitalId: e.target.value })}
        />
      </Section>
      <Section title="IP No.">
        <Input
          value={current.patient.ipNo}
          placeholder="IP number"
          onChange={(e) => setPatient({ ipNo: e.target.value })}
        />
      </Section>
      <Section title="Age">
        <Input
          inputMode="numeric"
          value={current.patient.age}
          placeholder="Age"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            setPatient({ age: v === '' ? '' : Number(v) })
          }}
        />
      </Section>
      <Section title="Sex">
        <ChipScroller>
          {(['M', 'F', 'Other'] as const).map((s) => (
            <Chip
              key={s}
              selected={current.patient.sex === s}
              onClick={() => setPatient({ sex: s })}
            >
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Date">
        <Input
          type="date"
          value={current.patient.date}
          onChange={(e) => setPatient({ date: e.target.value })}
        />
      </Section>
      {current.kind === 'cag' ? null : (
        <Section title="Start time">
          <Input
            type="time"
            value={current.patient.startTime}
            onChange={(e) => setPatient({ startTime: e.target.value })}
          />
        </Section>
      )}
      <div className="lg:col-span-2">
      <Section title="Symptoms">
        <ChipScroller>
          {SYMPTOM_CHIPS.map((s) => (
            <Chip
              key={s}
              selected={(current.indication.symptoms ?? []).includes(s)}
              onClick={() =>
                mutate((p) => {
                  const cur = p.indication.symptoms ?? []
                  const symptoms = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
                  return { ...p, indication: { ...p.indication, symptoms } }
                })
              }
            >
              {s}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      </div>
      <div className="lg:col-span-2">
      <Section title="Indication">
        <ChipScroller>
          {INDICATION_CHIPS.map((c) => (
            <Chip
              key={c}
              selected={current.indication.chips.includes(c)}
              onClick={() => toggleChip(c)}
            >
              {c}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      </div>
      {current.indication.chips.includes('Pre-op Evaluation') ? (
        <div className="lg:col-span-2">
        <Section title="Valvular surgery">
          <ChipScroller>
            {VALVE_SURGERIES.map((v) => (
              <Chip
                key={v}
                selected={(current.indication.valveSurgeries ?? []).includes(v)}
                onClick={() =>
                  mutate((p) => {
                    const cur = p.indication.valveSurgeries ?? []
                    const valveSurgeries = cur.includes(v)
                      ? cur.filter((x) => x !== v)
                      : [...cur, v]
                    return { ...p, indication: { ...p.indication, valveSurgeries } }
                  })
                }
              >
                {v}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        </div>
      ) : null}
      {current.indication.chips.includes('Post-CABG') ? (
        <div className="lg:col-span-2">
        <Section title="Grafts">
          <ChipScroller>
            {CABG_GRAFTS.map((g) => (
              <Chip
                key={g}
                selected={(current.indication.grafts ?? []).includes(g)}
                onClick={() =>
                  mutate((p) => {
                    const cur = p.indication.grafts ?? []
                    const grafts = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]
                    return { ...p, indication: { ...p.indication, grafts } }
                  })
                }
              >
                {g}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        </div>
      ) : null}
      {current.indication.chips.includes('Post-PCI') ? (
        <div className="lg:col-span-2">
        <Section title="Stent territory">
          <ChipScroller>
            {PRIOR_PCI_TERRITORIES.map((t) => (
              <Chip
                key={t}
                selected={(current.indication.stentTerritories ?? []).includes(t)}
                onClick={() =>
                  mutate((p) => {
                    const cur = p.indication.stentTerritories ?? []
                    const stentTerritories = cur.includes(t)
                      ? cur.filter((x) => x !== t)
                      : [...cur, t]
                    return { ...p, indication: { ...p.indication, stentTerritories } }
                  })
                }
              >
                {t}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        </div>
      ) : null}
      {current.indication.chips.includes('STEMI') ? (
        <div className="lg:col-span-2">
        <Section title="STEMI territory">
          <ChipScroller>
            {STEMI_TERRITORIES.map((t) => (
              <Chip
                key={t}
                selected={current.indication.stemiTerritory === t}
                onClick={() =>
                  mutate((p) => ({
                    ...p,
                    indication: { ...p.indication, stemiTerritory: t },
                  }))
                }
              >
                {t}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        </div>
      ) : null}
      <div className="lg:col-span-2">
      <Section title="Type of PCI">
        <ChipScroller>
          {PCI_TYPES.map((t) => (
            <Chip
              key={t}
              selected={current.indication.pciType === t}
              onClick={() =>
                mutate((p) => ({
                  ...p,
                  indication: {
                    ...p.indication,
                    pciType: p.indication.pciType === t ? undefined : t,
                  },
                }))
              }
            >
              {t}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      </div>
      <div className="lg:col-span-2">
      <Section title="Operators">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Main</p>
            <Select
              value={current.mainOperator ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setDoctors(v, current.assistantOperator ?? '')
                if (v) void remember('operator', v)
              }}
            >
              <option value="">Select main operator</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
              {current.mainOperator &&
              !doctors.some((d) => d.name === current.mainOperator) ? (
                <option value={current.mainOperator}>{current.mainOperator}</option>
              ) : null}
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Assistant</p>
            <Select
              value={current.assistantOperator ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setDoctors(current.mainOperator ?? '', v)
                if (v) void remember('operator', v)
              }}
            >
              <option value="">Select assistant</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
              {current.assistantOperator &&
              !doctors.some((d) => d.name === current.assistantOperator) ? (
                <option value={current.assistantOperator}>{current.assistantOperator}</option>
              ) : null}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Add doctor to list"
            value={opDraft}
            onChange={(e) => setOpDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = opDraft.trim()
                if (!v) return
                void addCustom('operator', v)
                setOpDraft('')
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const v = opDraft.trim()
              if (!v) return
              void addCustom('operator', v)
              setOpDraft('')
            }}
          >
            Add
          </Button>
        </div>
      </Section>
      </div>
      <Section title={current.kind === 'cag' ? 'Consultant' : 'Doctor Name'}>
        <Input
          value={lab.doctorName}
          placeholder={current.kind === 'cag' ? 'Consultant name' : 'Doctor name'}
          onChange={(e) => setLab({ doctorName: e.target.value })}
        />
      </Section>
      <Section title="Technologist">
        <Input
          value={lab.technologist}
          placeholder="Technologist"
          onChange={(e) => setLab({ technologist: e.target.value })}
        />
      </Section>
      <Section title="Scrub Nurse">
        <Input
          value={lab.scrubNurse}
          placeholder="Scrub nurse"
          onChange={(e) => setLab({ scrubNurse: e.target.value })}
        />
      </Section>
      <Section title="Access">
        <Input
          value={lab.access}
          placeholder="e.g. Right radial"
          onChange={(e) => setLab({ access: e.target.value })}
        />
      </Section>
      <Section title="Catheter">
        <Input
          value={lab.catheter}
          placeholder="e.g. 5F TIG"
          onChange={(e) => setLab({ catheter: e.target.value })}
        />
      </Section>
      <Section title="Contrast">
        <Input
          value={lab.contrast}
          placeholder="e.g. Iohexol 40 mL"
          onChange={(e) => setLab({ contrast: e.target.value })}
        />
      </Section>
      {current.kind === 'cag' ? (
        <Section title="Inventory">
          <Input
            value={lab.inventory}
            placeholder="e.g. 5F Radial sheath, 0.035&quot; J-tip guidewire"
            onChange={(e) => setLab({ inventory: e.target.value })}
          />
        </Section>
      ) : null}
      <div className="lg:col-span-2">
        <Section title="Haemodynamic Data">
          <Textarea
            value={lab.haemodynamicData}
            placeholder="Haemodynamic data"
            onChange={(e) => setLab({ haemodynamicData: e.target.value })}
          />
        </Section>
      </div>
      <Section title="Aortic Pressure">
        <div className="relative">
          <Input
            value={lab.aorticPressureMmHg}
            placeholder="e.g. 120/80"
            onChange={(e) => setLab({ aorticPressureMmHg: e.target.value })}
            className="pr-16"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
            mmHg
          </span>
        </div>
      </Section>
      {current.kind === 'cag' ? (
        <Section title="LVEDP">
          <div className="relative">
            <Input
              value={lab.lvedp}
              placeholder="e.g. 12"
              onChange={(e) => setLab({ lvedp: e.target.value })}
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              mmHg
            </span>
          </div>
        </Section>
      ) : null}
      <Button size="lg" className="w-full lg:col-span-2" onClick={() => navigate(`/procedure/${id}/access`)}>
        Next — Access
      </Button>
    </div>
  )
}
