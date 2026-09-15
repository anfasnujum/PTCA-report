import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { CABG_GRAFTS, CONSULTANTS, INDICATION_CHIPS, matchConsultant, PCI_TYPES, PRIOR_PCI_TERRITORIES, STEMI_TERRITORIES, SYMPTOM_CHIPS, VALVE_SURGERIES } from '@/lib/constants'
import { emptyLab } from '@/lib/seed'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import type { LabDetails, Patient } from '@/types/procedure'

export function PatientPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  const initialDoctor = current?.lab?.doctorName ?? ''
  const [consultantOther, setConsultantOther] = useState(
    () => Boolean(initialDoctor.trim()) && !matchConsultant(initialDoctor),
  )

  if (!current) return null

  const setPatient = (patch: Partial<Patient>) =>
    mutate((p) => ({ ...p, patient: { ...p.patient, ...patch } }))

  const setLab = (patch: Partial<LabDetails>) =>
    mutate((p) => ({ ...p, lab: { ...(p.lab ?? emptyLab()), ...patch } }))

  const lab = current.lab ?? emptyLab()
  const listedConsultant = matchConsultant(lab.doctorName)
  const consultantSelect = consultantOther ? 'Other' : listedConsultant

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
      <Section title={current.kind === 'cag' ? 'Consultant' : 'Doctor Name'}>
        <Select
          value={consultantSelect}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'Other') {
              setConsultantOther(true)
              setLab({ doctorName: listedConsultant ? '' : lab.doctorName })
              return
            }
            setConsultantOther(false)
            setLab({ doctorName: v })
          }}
        >
          <option value="">Select</option>
          {CONSULTANTS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="Other">Other</option>
        </Select>
        {consultantSelect === 'Other' ? (
          <Input
            className="mt-2"
            value={lab.doctorName}
            placeholder={current.kind === 'cag' ? 'Consultant name' : 'Doctor name'}
            onChange={(e) => setLab({ doctorName: e.target.value })}
          />
        ) : null}
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
