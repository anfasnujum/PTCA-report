import { Chip, ChipScroller } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { INDICATION_CHIPS, STEMI_TERRITORIES } from '@/lib/constants'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import type { Patient } from '@/types/procedure'

export function PatientPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  const [opDraft, setOpDraft] = useState('')

  if (!current) return null

  const setPatient = (patch: Partial<Patient>) =>
    mutate((p) => ({ ...p, patient: { ...p.patient, ...patch } }))

  const toggleChip = (chip: string) => {
    mutate((p) => {
      const chips = p.indication.chips.includes(chip)
        ? p.indication.chips.filter((c) => c !== chip)
        : [...p.indication.chips, chip]
      const stemiTerritory = chips.includes('STEMI') ? p.indication.stemiTerritory : undefined
      return { ...p, indication: { ...p.indication, chips, stemiTerritory } }
    })
  }

  return (
    <div className="space-y-5">
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
      <Section title="Hospital no.">
        <Input
          value={current.patient.hospitalId}
          placeholder="Hospital ID"
          onChange={(e) => setPatient({ hospitalId: e.target.value })}
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
      <Section title="Start time">
        <Input
          type="time"
          value={current.patient.startTime}
          onChange={(e) => setPatient({ startTime: e.target.value })}
        />
      </Section>
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
      {current.indication.chips.includes('STEMI') ? (
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
      ) : null}
      <Section title="Operators">
        <ChipScroller>
          {current.operators.map((op) => (
            <Chip
              key={op}
              selected
              onClick={() =>
                mutate((p) => ({ ...p, operators: p.operators.filter((o) => o !== op) }))
              }
            >
              {op} ×
            </Chip>
          ))}
        </ChipScroller>
        <div className="flex gap-2">
          <Input
            placeholder="Dr. Name"
            value={opDraft}
            onChange={(e) => setOpDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = opDraft.trim()
                if (!v) return
                mutate((p) => ({ ...p, operators: [...p.operators, v] }))
                setOpDraft('')
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const v = opDraft.trim()
              if (!v) return
              mutate((p) => ({ ...p, operators: [...p.operators, v] }))
              setOpDraft('')
            }}
          >
            Add
          </Button>
        </div>
      </Section>
      <Button size="lg" className="w-full" onClick={() => navigate(`/procedure/${id}/access`)}>
        Next — Access
      </Button>
    </div>
  )
}
