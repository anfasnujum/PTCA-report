import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CLOSURE_METHODS,
  COMPLICATION_CHIPS,
  CONDITIONS,
  CONTRAST_AGENTS,
  CONTRAST_PRESETS,
  DESTINATIONS,
  FLUORO_PRESETS,
  GP2B3A,
  HEPARIN_PRESETS,
} from '@/lib/constants'
import { STENOSIS_PRESETS } from '@/lib/format'
import { nowHm } from '@/lib/format'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useNavigate, useParams } from 'react-router-dom'
import type { Closure, Outcome, Periprocedural, TimiFlow } from '@/types/procedure'

export function ResultPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const navigate = useNavigate()
  const { id } = useParams()
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

  return (
    <div className="grid gap-5 pb-6 lg:grid-cols-2">
      <Section title={`Residual stenosis  ${current.outcome.residualStenosis}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={current.outcome.residualStenosis}
          onChange={(e) => setOutcome({ residualStenosis: Number(e.target.value) })}
          className="w-full accent-cyan-400"
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
      <Section title="Comment">
        <Textarea
          value={current.outcome.comment}
          placeholder="Optional result comment"
          onChange={(e) => setOutcome({ comment: e.target.value })}
        />
      </Section>
      <Section title="Heparin">
        <NumberChips
          values={HEPARIN_PRESETS}
          value={typeof current.periprocedural.heparinIU === 'number' ? current.periprocedural.heparinIU : 0}
          onChange={(heparinIU) => setPeri({ heparinIU })}
          suffix=" IU"
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
      <Section title="Contrast">
        <ChipScroller>
          {CONTRAST_AGENTS.map((a) => (
            <Chip
              key={a}
              selected={current.periprocedural.contrastAgent === a}
              onClick={() => setPeri({ contrastAgent: a })}
            >
              {a}
            </Chip>
          ))}
        </ChipScroller>
        <NumberChips
          values={CONTRAST_PRESETS}
          value={typeof current.periprocedural.contrastVolumeMl === 'number' ? current.periprocedural.contrastVolumeMl : 0}
          onChange={(contrastVolumeMl) => setPeri({ contrastVolumeMl })}
          suffix=" mL"
        />
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
      <Button size="lg" className="w-full lg:col-span-2" onClick={() => navigate(`/procedure/${id}/preview`)}>
        Preview note
      </Button>
    </div>
  )
}
