import { useState } from 'react'
import { Download } from 'lucide-react'
import type { AngioFinding, TimiFlow, Vessel } from '@/types/procedure'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ANGIO_FEATURES } from '@/lib/constants'
import { downloadAngioPdf } from '@/lib/angioPdf'
import { CORONARY_TREE, TREE_VIEWBOX, interactiveStroke } from '@/lib/coronaryTree'
import {
  asSegments,
  LEFT_VESSELS,
  RIGHT_VESSELS,
  SEGMENTS,
  STENOSIS_PRESETS,
  toggleSegment,
} from '@/lib/format'
import { nid } from '@/lib/ids'
import { useProcedureStore } from '@/store/useProcedureStore'
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(240px,1fr)] lg:items-start">
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
  const current = useProcedureStore((s) => s.current)
  const [exporting, setExporting] = useState(false)

  const exportPdf = async () => {
    if (!current) return
    setExporting(true)
    try {
      await downloadAngioPdf({ ...current, baselineAngio: findings })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not create the angiogram PDF.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="h-full rounded-2xl bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Coronary tree — tap a vessel
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void exportPdf()}
          disabled={!current || exporting}
        >
          <Download className="size-4" />
          {exporting ? 'Preparing…' : 'Download PDF'}
        </Button>
      </div>
      <svg viewBox={`0 0 ${TREE_VIEWBOX.w} ${TREE_VIEWBOX.h}`} className="h-auto w-full">
        <text x="20" y="26" fill="#10172a" fontSize="12">
          Left
        </text>
        <text x="348" y="26" fill="#10172a" fontSize="12">
          Right
        </text>
        {CORONARY_TREE.map((b) => (
          <VesselPath
            key={b.vessel}
            d={b.d}
            label={b.label}
            lx={b.lx}
            ly={b.ly}
            color={interactiveStroke(findings.find((f) => f.vessel === b.vessel))}
            onClick={() => onSelect(b.vessel)}
          />
        ))}
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
      <path d={d} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
      <text x={lx} y={ly} fill="#10172a" fontSize="12" fontWeight="600">
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
        {f.vessel === 'LMCA' ? (
          <>
            <Switch
              label="Early bifurcation"
              yesNo
              checked={!!f.earlyBifurcation}
              onChange={(earlyBifurcation) => setF({ ...f, earlyBifurcation })}
            />
            <Section title="Length">
              <div className="relative">
                <Input
                  inputMode="decimal"
                  placeholder="Length"
                  value={f.lengthMm ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d*\.?\d*$/.test(v)) {
                      setF({ ...f, lengthMm: v })
                    }
                  }}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                  mm
                </span>
              </div>
            </Section>
          </>
        ) : null}
        <Section title="Segment">
          <ChipScroller>
            {SEGMENTS.map((s) => (
              <Chip
                key={s}
                selected={asSegments(f.segment).includes(s)}
                onClick={() => setF({ ...f, segment: toggleSegment(f.segment, s) })}
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
            className="w-full accent-accent"
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
