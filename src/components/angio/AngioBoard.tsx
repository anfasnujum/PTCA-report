import { useState } from 'react'
import type { AngioFinding, Segment, TimiFlow, Vessel } from '@/types/procedure'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { ANGIO_FEATURES } from '@/lib/constants'
import { LEFT_VESSELS, RIGHT_VESSELS, SEGMENTS, STENOSIS_PRESETS } from '@/lib/format'
import { nid } from '@/lib/ids'
import { cn } from '@/lib/utils'

function stenosisColor(n: number): string {
  if (n >= 90) return 'bg-danger/20 border-danger text-danger'
  if (n >= 50) return 'bg-warn/15 border-warn text-warn'
  if (n > 0) return 'bg-ok/10 border-ok/60 text-ok'
  return 'bg-card border-border text-muted'
}

function emptyFinding(vessel: Vessel): AngioFinding {
  return {
    id: nid(),
    vessel,
    stenosis: 0,
    timiFlow: 3,
    features: [],
    isTarget: false,
  }
}

export function AngioBoard({
  findings,
  onChange,
}: {
  findings: AngioFinding[]
  onChange: (next: AngioFinding[]) => void
}) {
  const [editing, setEditing] = useState<AngioFinding | null>(null)

  const get = (v: Vessel) => findings.find((f) => f.vessel === v)

  const open = (v: Vessel) => setEditing(get(v) ?? emptyFinding(v))

  const save = (f: AngioFinding) => {
    const rest = findings.filter((x) => x.vessel !== f.vessel)
    onChange([...rest, f])
    setEditing(null)
  }

  const renderGroup = (label: string, vessels: Vessel[]) => (
    <Section title={label}>
      <div className="grid grid-cols-3 gap-2">
        {vessels.map((v) => {
          const f = get(v)
          return (
            <button
              key={v}
              type="button"
              onClick={() => open(v)}
              className={cn(
                'min-h-16 rounded-2xl border px-2 py-2 text-center',
                stenosisColor(f?.stenosis ?? 0),
                f?.isTarget && 'ring-2 ring-accent',
              )}
            >
              <div className="text-sm font-semibold">{v}</div>
              <div className="text-xs opacity-80">
                {f ? `${f.stenosis}% · T${f.timiFlow}` : 'tap'}
              </div>
            </button>
          )
        })}
      </div>
    </Section>
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CoronarySchematic onSelect={open} findings={findings} />
        <div className="space-y-5">
          {renderGroup('Left system', LEFT_VESSELS)}
          {renderGroup('Right system', RIGHT_VESSELS)}
        </div>
      </div>
      {editing ? (
        <FindingSheet
          finding={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onClear={() => {
            onChange(findings.filter((f) => f.vessel !== editing.vessel))
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function CoronarySchematic({
  onSelect,
  findings,
}: {
  onSelect: (v: Vessel) => void
  findings: AngioFinding[]
}) {
  const fill = (v: Vessel) => {
    const n = findings.find((f) => f.vessel === v)?.stenosis ?? 0
    if (n >= 90) return '#fb7185'
    if (n >= 50) return '#fbbf24'
    if (n > 0) return '#34d399'
    return '#4b6082'
  }
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Coronary tree — tap a vessel
      </p>
      <svg viewBox="0 0 320 236" className="h-auto w-full">
        <text x="16" y="22" fill="#8b9bb4" fontSize="11">
          Left
        </text>
        <text x="250" y="22" fill="#8b9bb4" fontSize="11">
          Right
        </text>
        <VesselPath d="M90 40 C70 55 58 70 52 95" label="LMCA" lx={18} ly={70} color={fill('LMCA')} onClick={() => onSelect('LMCA')} />
        <VesselPath d="M52 95 C48 130 55 165 70 210" label="LAD" lx={18} ly={168} color={fill('LAD')} onClick={() => onSelect('LAD')} />
        <VesselPath d="M55 118 L95 140" label="D1" lx={98} ly={136} color={fill('D1')} onClick={() => onSelect('D1')} />
        <VesselPath d="M58 150 L100 170" label="D2" lx={104} ly={174} color={fill('D2')} onClick={() => onSelect('D2')} />
        <VesselPath d="M64 182 L108 198" label="D3" lx={112} ly={204} color={fill('D3')} onClick={() => onSelect('D3')} />
        <VesselPath d="M48 122 L18 138" label="S1" lx={4} ly={152} color={fill('S1')} onClick={() => onSelect('S1')} />
        <VesselPath d="M52 95 C90 110 120 130 150 175" label="LCX" lx={152} ly={162} color={fill('LCX')} onClick={() => onSelect('LCX')} />
        <VesselPath d="M100 125 L130 115" label="OM1" lx={132} ly={108} color={fill('OM1')} onClick={() => onSelect('OM1')} />
        <VesselPath d="M125 148 L158 138" label="OM2" lx={160} ly={134} color={fill('OM2')} onClick={() => onSelect('OM2')} />
        <VesselPath d="M142 168 L178 160" label="OM3" lx={180} ly={158} color={fill('OM3')} onClick={() => onSelect('OM3')} />
        <VesselPath d="M70 100 L110 90" label="RI" lx={112} ly={86} color={fill('Ramus')} onClick={() => onSelect('Ramus')} />
        <VesselPath d="M250 40 C260 80 255 130 230 210" label="RCA" lx={268} ly={120} color={fill('RCA')} onClick={() => onSelect('RCA')} />
        <VesselPath d="M256 58 L292 48" label="Conus" lx={270} ly={42} color={fill('Conus')} onClick={() => onSelect('Conus')} />
        <VesselPath d="M254 108 L218 96" label="AM" lx={196} ly={92} color={fill('AM')} onClick={() => onSelect('AM')} />
        <VesselPath d="M240 182 L198 210" label="PDA" lx={168} ly={216} color={fill('PDA')} onClick={() => onSelect('PDA')} />
        <VesselPath d="M245 168 L278 200" label="PLV" lx={280} ly={210} color={fill('PLV')} onClick={() => onSelect('PLV')} />
      </svg>
    </div>
  )
}

function VesselPath({
  d,
  label,
  lx,
  ly,
  color,
  onClick,
}: {
  d: string
  label: string
  lx: number
  ly: number
  color: string
  onClick: () => void
}) {
  return (
    <g onClick={onClick} className="cursor-pointer">
      <path d={d} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      <text x={lx} y={ly} fill="#e8eef7" fontSize="11" fontWeight="600">
        {label}
      </text>
    </g>
  )
}

function FindingSheet({
  finding,
  onClose,
  onSave,
  onClear,
}: {
  finding: AngioFinding
  onClose: () => void
  onSave: (f: AngioFinding) => void
  onClear: () => void
}) {
  const [f, setF] = useState(finding)
  const toggleFeature = (feat: string) => {
    setF({
      ...f,
      features: f.features.includes(feat)
        ? f.features.filter((x) => x !== feat)
        : [...f.features, feat],
    })
  }

  return (
    <BottomSheet
      open
      title={f.vessel}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClear}>
            Clear
          </Button>
          <Button className="flex-1" onClick={() => onSave(f)}>
            Save finding
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Section title="Segment">
          <ChipScroller>
            {SEGMENTS.map((s) => (
              <Chip
                key={s}
                selected={f.segment === s}
                onClick={() => setF({ ...f, segment: s as Segment })}
              >
                {s}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title={`Stenosis  ${f.stenosis}%`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={f.stenosis}
            onChange={(e) => setF({ ...f, stenosis: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
          <NumberChips
            values={STENOSIS_PRESETS}
            value={f.stenosis}
            onChange={(stenosis) => setF({ ...f, stenosis })}
            suffix="%"
          />
        </Section>
        <Section title="TIMI flow">
          <ChipScroller>
            {([0, 1, 2, 3] as TimiFlow[]).map((t) => (
              <Chip key={t} selected={f.timiFlow === t} onClick={() => setF({ ...f, timiFlow: t })}>
                TIMI {t === 0 ? '0' : t === 1 ? 'I' : t === 2 ? 'II' : 'III'}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Section title="Features">
          <ChipScroller>
            {ANGIO_FEATURES.map((feat) => (
              <Chip
                key={feat}
                selected={f.features.includes(feat)}
                onClick={() => toggleFeature(feat)}
              >
                {feat}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        <Switch
          label="Target vessel"
          checked={f.isTarget}
          onChange={(isTarget) => setF({ ...f, isTarget })}
        />
      </div>
    </BottomSheet>
  )
}
