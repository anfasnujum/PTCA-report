import { useState } from 'react'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CAG_ADVICES,
  CAG_IMPRESSIONS,
  CLOSURE_METHODS,
  COMPLICATION_CHIPS,
  CONDITIONS,
  DESTINATIONS,
  FLUORO_PRESETS,
  GP2B3A,
  HEPARIN_PRESETS,
} from '@/lib/constants'
import {
  STENOSIS_PRESETS,
  addCagCustomImpression,
  nowHm,
  toggleCagAdvice,
  toggleCagImpression,
} from '@/lib/format'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import type { Closure, Outcome, Periprocedural, TimiFlow } from '@/types/procedure'

export function ResultPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
  const [impressionDraft, setImpressionDraft] = useState('')
  const [adviceDraft, setAdviceDraft] = useState('')
  if (!current) return null

  const setOutcome = (patch: Partial<Outcome>) =>
    mutate((p) => ({ ...p, outcome: { ...p.outcome, ...patch } }))
  const setPeri = (patch: Partial<Periprocedural>) =>
    mutate((p) => ({ ...p, periprocedural: { ...p.periprocedural, ...patch } }))
  const setClosure = (patch: Partial<Closure>) =>
    mutate((p) => ({ ...p, closure: { ...p.closure, ...patch } }))

  const toggleComp = (c: string) => {
    const cur = current.outcome.complications
    let next: string[]
    if (c === 'none') next = ['none']
    else {
      next = cur.filter((x) => x !== 'none' && x !== c)
      if (!cur.includes(c)) next.push(c)
      if (next.length === 0) next = ['none']
    }
    setOutcome({ complications: next })
  }

  if (current.kind === 'cag') {
    const selected = current.cagImpressions ?? []
    const custom = current.cagCustomImpressions ?? []
    const advices = current.cagAdvices ?? []
    const customAdvices = current.cagCustomAdvices ?? []
    const addDraft = () => {
      if (!impressionDraft.trim()) return
      mutate((p) => ({
        ...p,
        cagCustomImpressions: addCagCustomImpression(p.cagCustomImpressions ?? [], impressionDraft),
      }))
      setImpressionDraft('')
    }
    const addAdviceDraft = () => {
      if (!adviceDraft.trim()) return
      mutate((p) => ({
        ...p,
        cagCustomAdvices: addCagCustomImpression(p.cagCustomAdvices ?? [], adviceDraft),
      }))
      setAdviceDraft('')
    }
    return (
      <div className="grid gap-5 pb-6">
        <div className="space-y-3">
          <Switch
            label="LIMA"
            yesNo
            checked={!!current.cagLimaOn}
            onChange={(cagLimaOn) => mutate((p) => ({ ...p, cagLimaOn }))}
          />
          {current.cagLimaOn ? (
            <Input
              placeholder="Enter LIMA finding"
              value={current.cagLimaNote ?? ''}
              onChange={(e) => mutate((p) => ({ ...p, cagLimaNote: e.target.value }))}
            />
          ) : null}
        </div>
        <div className="space-y-3">
          <Switch
            label="RIMA"
            yesNo
            checked={!!current.cagRimaOn}
            onChange={(cagRimaOn) => mutate((p) => ({ ...p, cagRimaOn }))}
          />
          {current.cagRimaOn ? (
            <Input
              placeholder="Enter RIMA finding"
              value={current.cagRimaNote ?? ''}
              onChange={(e) => mutate((p) => ({ ...p, cagRimaNote: e.target.value }))}
            />
          ) : null}
        </div>
        <Section title="Impression">
          <ChipScroller>
            {CAG_IMPRESSIONS.map((o) => (
              <Chip
                key={o.id}
                selected={selected.includes(o.id)}
                onClick={() =>
                  mutate((p) => ({
                    ...p,
                    cagImpressions: toggleCagImpression(p.cagImpressions ?? [], o.id),
                  }))
                }
              >
                {o.label}
              </Chip>
            ))}
            {custom.map((label) => (
              <Chip
                key={label}
                selected
                onClick={() =>
                  mutate((p) => ({
                    ...p,
                    cagCustomImpressions: (p.cagCustomImpressions ?? []).filter((x) => x !== label),
                  }))
                }
              >
                {label}
              </Chip>
            ))}
          </ChipScroller>
          <div className="flex gap-2">
            <Input
              placeholder="Add impression"
              value={impressionDraft}
              onChange={(e) => setImpressionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addDraft()
                }
              }}
            />
            <Button variant="secondary" onClick={addDraft}>
              Add
            </Button>
          </div>
        </Section>
        <Section title="Advice">
          <ChipScroller>
            {CAG_ADVICES.map((o) => (
              <Chip
                key={o.id}
                selected={advices.includes(o.id)}
                onClick={() =>
                  mutate((p) => ({
                    ...p,
                    cagAdvices: toggleCagAdvice(p.cagAdvices ?? [], o.id),
                  }))
                }
              >
                {o.label}
              </Chip>
            ))}
            {customAdvices.map((label) => (
              <Chip
                key={label}
                selected
                onClick={() =>
                  mutate((p) => ({
                    ...p,
                    cagCustomAdvices: (p.cagCustomAdvices ?? []).filter((x) => x !== label),
                  }))
                }
              >
                {label}
              </Chip>
            ))}
          </ChipScroller>
          <div className="flex gap-2">
            <Input
              placeholder="Add advice"
              value={adviceDraft}
              onChange={(e) => setAdviceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addAdviceDraft()
                }
              }}
            />
            <Button variant="secondary" onClick={addAdviceDraft}>
              Add
            </Button>
          </div>
        </Section>
        <Button size="lg" className="w-full" data-enter-next onClick={() => navigate(`/procedure/${id}/preview`)}>
          Next — Final
        </Button>
      </div>
    )
  }

  const resultGood =
    current.outcome.residualStenosis === 0 && current.outcome.finalTimiFlow === 3

  return (
    <div className="grid gap-5 pb-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <Section title="Result">
          <ChipScroller>
            <Chip
              selected={resultGood}
              onClick={() => setOutcome({ residualStenosis: 0, finalTimiFlow: 3 })}
            >
              Good
            </Chip>
            <Chip
              selected={!resultGood}
              onClick={() =>
                setOutcome({
                  residualStenosis: current.outcome.residualStenosis === 0 ? 20 : current.outcome.residualStenosis,
                  finalTimiFlow: current.outcome.finalTimiFlow === 3 ? 2 : current.outcome.finalTimiFlow,
                })
              }
            >
              Suboptimal
            </Chip>
          </ChipScroller>
        </Section>
      </div>
      <Section title="Complications">
        <ChipScroller>
          {COMPLICATION_CHIPS.map((c) => (
            <Chip
              key={c}
              selected={current.outcome.complications.includes(c)}
              onClick={() => toggleComp(c)}
            >
              {c}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Heparin">
        <NumberChips
          values={HEPARIN_PRESETS}
          value={typeof current.periprocedural.heparinIU === 'number' ? current.periprocedural.heparinIU : 0}
          onChange={(heparinIU) => setPeri({ heparinIU })}
          suffix=" IU"
        />
      </Section>
      <Section title={`Residual stenosis  ${current.outcome.residualStenosis}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={current.outcome.residualStenosis}
          onChange={(e) => setOutcome({ residualStenosis: Number(e.target.value) })}
          className="w-full accent-accent"
        />
        <NumberChips
          values={STENOSIS_PRESETS}
          value={current.outcome.residualStenosis}
          onChange={(residualStenosis) => setOutcome({ residualStenosis })}
          suffix="%"
        />
      </Section>
      <Section title="Final TIMI">
        <ChipScroller>
          {([0, 1, 2, 3] as TimiFlow[]).map((t) => (
            <Chip
              key={t}
              selected={current.outcome.finalTimiFlow === t}
              onClick={() => setOutcome({ finalTimiFlow: t })}
            >
              TIMI {['0', 'I', 'II', 'III'][t]}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Dissection (NHLBI)">
        <ChipScroller>
          {(['none', 'A', 'B', 'C', 'D', 'E', 'F'] as const).map((d) => (
            <Chip
              key={d}
              selected={current.outcome.dissection === d}
              onClick={() => setOutcome({ dissection: d })}
            >
              {d}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Switch
        label="No-reflow"
        checked={current.outcome.noReflow}
        onChange={(noReflow) => setOutcome({ noReflow })}
      />
      <Switch
        label="Slow flow"
        checked={current.outcome.slowFlow}
        onChange={(slowFlow) => setOutcome({ slowFlow })}
      />
      <Switch
        label="Side-branch compromise"
        checked={current.outcome.sideBranchCompromise}
        onChange={(sideBranchCompromise) => setOutcome({ sideBranchCompromise })}
      />
      <Section title="Comment">
        <Textarea
          value={current.outcome.comment}
          placeholder="Optional result comment"
          onChange={(e) => setOutcome({ comment: e.target.value })}
        />
      </Section>
      <Section title="GP IIb/IIIa">
        <ChipScroller>
          {GP2B3A.map((g) => (
            <Chip
              key={g}
              selected={current.periprocedural.gp2b3a === g}
              onClick={() => setPeri({ gp2b3a: g })}
            >
              {g}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Fluoroscopy">
        <NumberChips
          values={FLUORO_PRESETS}
          value={typeof current.periprocedural.fluoroTimeMin === 'number' ? current.periprocedural.fluoroTimeMin : 0}
          onChange={(fluoroTimeMin) => setPeri({ fluoroTimeMin })}
          suffix=" min"
        />
      </Section>
      <Section title="DAP">
        <Input
          value={current.periprocedural.dap}
          placeholder="e.g. 42 Gy·cm²"
          onChange={(e) => setPeri({ dap: e.target.value })}
        />
      </Section>
      <Section title="Closure">
        <ChipScroller>
          {CLOSURE_METHODS.map((m) => (
            <Chip
              key={m}
              selected={current.closure.method === m}
              onClick={() => setClosure({ method: m })}
            >
              {m}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      {current.closure.method === 'closure device' ? (
        <Section title="Device">
          <ChipScroller>
            {['Angio-Seal', 'Perclose', 'ProGlide'].map((d) => (
              <Chip
                key={d}
                selected={current.closure.device === d}
                onClick={() => setClosure({ device: d })}
              >
                {d}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
      ) : null}
      <Section title="Destination">
        <ChipScroller>
          {DESTINATIONS.map((d) => (
            <Chip
              key={d}
              selected={current.closure.destination === d}
              onClick={() => setClosure({ destination: d })}
            >
              {d}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="Condition">
        <ChipScroller>
          {CONDITIONS.map((d) => (
            <Chip
              key={d}
              selected={current.closure.condition === d}
              onClick={() => setClosure({ condition: d })}
            >
              {d}
            </Chip>
          ))}
        </ChipScroller>
      </Section>
      <Section title="End time">
        <div className="flex gap-2">
          <Input
            type="time"
            value={current.closure.endTime}
            onChange={(e) => setClosure({ endTime: e.target.value })}
          />
          <Button variant="secondary" onClick={() => setClosure({ endTime: nowHm() })}>
            Now
          </Button>
        </div>
      </Section>
      <Button
        size="lg"
        className="w-full lg:col-span-2"
        data-enter-next
        onClick={() => navigate(`/procedure/${id}/preview`)}
      >
        Next — Final
      </Button>
    </div>
  )
}
