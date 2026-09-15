import { useState } from 'react'
import { Download } from 'lucide-react'
import type { AngioFinding, LadBranch, LadInvolvement, LadVesselType, LcxBranch, LcxDominance, RamusSize, RcaDominance, TimiFlow, Vessel } from '@/types/procedure'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ANGIO_FEATURES, DISTAL_SEGMENT_NOTES, FINDING_TYPES, LAD_BRANCHES, LAD_INVOLVEMENTS, LAD_VESSEL_TYPES, LCX_BRANCHES, LCX_DOMINANCE, PLAQUE_GRADES, RAMUS_SIZES, RCA_DISTAL_NOTES, RCA_DOMINANCE } from '@/lib/constants'
import { downloadAngioPdf } from '@/lib/angioPdf'
import { CORONARY_TREE, TREE_VIEWBOX, interactiveStroke } from '@/lib/coronaryTree'
import {
  asSegments,
  DEFAULT_STENOSIS_RANGE,
  LEFT_VESSELS,
  lmcaLengthMode,
  primarySegment,
  RIGHT_VESSELS,
  segmentsFor,
  selectSegment,
  showsLadBranchNotes,
  showsLcxBranchNotes,
  isLadOtherSegment,
  isDiagonalVessel,
  isOmVessel,
  isSizeVessel,
  vesselReportName,
  formatDescribedFinding,
  featureLabel,
  formatStenosis,
  findingSeverity,
  findingTypeOf,
  hasTimiFlow,
  stenosisModeOf,
  stenosisRangeOf,
  STENOSIS_PRESETS,
  timiRoman,
} from '@/lib/format'
import { nid } from '@/lib/ids'
import { useProcedureStore } from '@/store/useProcedureStore'
import { cn } from '@/lib/utils'

const MODE_CHIP = 'min-h-7 px-2.5 text-xs'

function stenosisColor(n: number): string {
  if (n >= 90) return 'bg-danger/20 border-danger text-danger'
  if (n >= 50) return 'bg-warn/15 border-warn text-warn'
  if (n > 0) return 'bg-ok/10 border-ok/60 text-ok'
  return 'bg-card border-border text-muted'
}

function StenosisValuePicker({
  label,
  value,
  onChange,
}: {
  label?: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <NumberChips values={STENOSIS_PRESETS} value={value} onChange={onChange} suffix="%" />
    </div>
  )
}

function PercentFields({
  title,
  f,
  setF,
}: {
  title: string
  f: AngioFinding
  setF: (next: AngioFinding) => void
}) {
  return (
    <Section
      title={`${title}  ${formatStenosis(f)}`}
      action={
        <ChipScroller>
          <Chip
            className={MODE_CHIP}
            selected={stenosisModeOf(f) === 'single'}
            onClick={() => setF({ ...f, stenosisMode: 'single' })}
          >
            Single
          </Chip>
          <Chip
            className={MODE_CHIP}
            selected={stenosisModeOf(f) === 'range'}
            onClick={() =>
              setF({
                ...f,
                stenosisMode: 'range',
                stenosisRange: f.stenosisRange ?? DEFAULT_STENOSIS_RANGE,
              })
            }
          >
            Range
          </Chip>
        </ChipScroller>
      }
    >
      {stenosisModeOf(f) === 'range' ? (
        <>
          <StenosisValuePicker
            label="From"
            value={f.stenosis}
            onChange={(stenosis) =>
              setF({
                ...f,
                stenosis,
                stenosisMode: 'range',
                stenosisRange: f.stenosisRange ?? DEFAULT_STENOSIS_RANGE,
              })
            }
          />
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Range</p>
            <div className="relative">
              <Input
                inputMode="numeric"
                placeholder="10"
                value={stenosisRangeOf(f)}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '' || /^\d+$/.test(v)) {
                    setF({
                      ...f,
                      stenosisMode: 'range',
                      stenosisRange: v === '' ? DEFAULT_STENOSIS_RANGE : Number(v),
                    })
                  }
                }}
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                %
              </span>
            </div>
          </div>
        </>
      ) : (
        <StenosisValuePicker
          value={f.stenosis}
          onChange={(stenosis) => setF({ ...f, stenosis, stenosisMode: 'single' })}
        />
      )}
    </Section>
  )
}

function emptyFinding(vessel: Vessel): AngioFinding {
  return {
    id: nid(),
    vessel,
    stenosis: 0,
    findingType: 'normal',
    timiFlow: 'none',
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
                stenosisColor(f ? findingSeverity(f) : 0),
                f?.isTarget && 'ring-2 ring-accent',
              )}
            >
              <div className="text-sm font-semibold">
                {v}
                {f?.omMajor ? ' · Major' : ''}
              </div>
              <div className="text-xs opacity-80">
                {f
                  ? isLadOtherSegment(f)
                    ? (f.segmentOther?.trim() || 'other')
                    : `${formatDescribedFinding(f)}${hasTimiFlow(f) ? ` · T${timiRoman(f.timiFlow)}` : ''}`
                  : 'tap'}
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
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
  const ladOther = isLadOtherSegment(f)
  const hideNotes =
    f.vessel === 'Ramus' ||
    (findingTypeOf(f) === 'normal' &&
      (f.vessel === 'LAD' || f.vessel === 'LCX' || f.vessel === 'RCA'))
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
      title={vesselReportName(f)}
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
              label="Separate origin of LAD and LCX"
              yesNo
              checked={!!f.separateOrigin}
              onChange={(separateOrigin) => setF({ ...f, separateOrigin })}
            />
            {!f.separateOrigin ? (
              <Section
                title="Length"
                action={
                  <ChipScroller>
                    <Chip
                      className={MODE_CHIP}
                      selected={lmcaLengthMode(f) === 'category'}
                      onClick={() => setF({ ...f, lengthMode: 'category' })}
                    >
                      Category
                    </Chip>
                    <Chip
                      className={MODE_CHIP}
                      selected={lmcaLengthMode(f) === 'mm'}
                      onClick={() => setF({ ...f, lengthMode: 'mm' })}
                    >
                      mm
                    </Chip>
                  </ChipScroller>
                }
              >
                {lmcaLengthMode(f) === 'mm' ? (
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      placeholder="Length"
                      value={f.lengthMm ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          setF({ ...f, lengthMm: v, lengthMode: 'mm' })
                        }
                      }}
                      className="pr-14"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                      mm
                    </span>
                  </div>
                ) : (
                  <ChipScroller>
                    {(['short', 'long'] as const).map((c) => (
                      <Chip
                        key={c}
                        selected={f.lengthCategory === c}
                        onClick={() => setF({ ...f, lengthCategory: c, lengthMode: 'category' })}
                      >
                        {c}
                      </Chip>
                    ))}
                  </ChipScroller>
                )}
              </Section>
            ) : null}
          </>
        ) : null}
        {f.vessel === 'LAD' ? (
          <Section title="Type">
            <ChipScroller>
              {LAD_VESSEL_TYPES.map((t) => (
                <Chip
                  key={t}
                  selected={f.ladType === t}
                  onClick={() =>
                    setF({ ...f, ladType: f.ladType === t ? undefined : (t as LadVesselType) })
                  }
                >
                  {t}
                </Chip>
              ))}
              <Chip
                selected={!!f.ladRemarkOpen}
                onClick={() => setF({ ...f, ladRemarkOpen: !f.ladRemarkOpen })}
              >
                Remark
              </Chip>
            </ChipScroller>
            {f.ladRemarkOpen ? (
              <Input
                placeholder="Enter remark"
                value={f.ladRemark ?? ''}
                onChange={(e) => setF({ ...f, ladRemark: e.target.value })}
              />
            ) : null}
          </Section>
        ) : null}
        {f.vessel === 'LCX' ? (
          <Section title="Dominance">
            <ChipScroller>
              {LCX_DOMINANCE.map((d) => (
                <Chip
                  key={d.id}
                  selected={f.lcxDominance === d.id}
                  onClick={() =>
                    setF({
                      ...f,
                      lcxDominance: f.lcxDominance === d.id ? undefined : (d.id as LcxDominance),
                    })
                  }
                >
                  {d.label}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : null}
        {isSizeVessel(f.vessel) ? (
          <Section title="Size">
            <ChipScroller>
              {RAMUS_SIZES.map((s) => (
                <Chip
                  key={s.id}
                  selected={f.ramusSize === s.id}
                  onClick={() =>
                    setF({
                      ...f,
                      ramusSize: f.ramusSize === s.id ? undefined : (s.id as RamusSize),
                    })
                  }
                >
                  {s.label}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : null}
        {f.vessel === 'RCA' ? (
          <Section title="Dominance">
            <ChipScroller>
              {RCA_DOMINANCE.map((d) => (
                <Chip
                  key={d.id}
                  selected={f.rcaDominance === d.id}
                  onClick={() =>
                    setF({
                      ...f,
                      rcaDominance: f.rcaDominance === d.id ? undefined : (d.id as RcaDominance),
                    })
                  }
                >
                  {d.label}
                </Chip>
              ))}
              <Chip
                selected={!!f.rcaRemarkOpen}
                onClick={() => setF({ ...f, rcaRemarkOpen: !f.rcaRemarkOpen })}
              >
                Remark
              </Chip>
            </ChipScroller>
            {f.rcaRemarkOpen ? (
              <Input
                placeholder="Enter remark"
                value={f.rcaRemark ?? ''}
                onChange={(e) => setF({ ...f, rcaRemark: e.target.value })}
              />
            ) : null}
          </Section>
        ) : null}
        {isOmVessel(f.vessel) || isDiagonalVessel(f.vessel) ? (
          <Switch
            label="Major"
            yesNo
            checked={!!f.omMajor}
            onChange={(omMajor) => setF({ ...f, omMajor })}
          />
        ) : null}
        <Section title="Segment">
          <ChipScroller>
            {(f.vessel === 'LAD' ? [...segmentsFor(f.vessel), 'other' as const] : segmentsFor(f.vessel)).map(
              (s) => (
                <Chip
                  key={s}
                  selected={primarySegment(f.segment) === s}
                  onClick={() => setF({ ...f, segment: selectSegment(f.segment, s) })}
                >
                  {s === 'other' ? 'Other' : s}
                </Chip>
              ),
            )}
          </ChipScroller>
          {ladOther ? (
            <Input
              placeholder="Enter finding"
              value={f.segmentOther ?? ''}
              onChange={(e) => setF({ ...f, segmentOther: e.target.value })}
            />
          ) : null}
        </Section>
        {ladOther ? null : (
          <>
        <Section title="Condition">
          <ChipScroller>
            {FINDING_TYPES.map((t) => (
              <Chip
                key={t.id}
                selected={findingTypeOf(f) === t.id}
                onClick={() => setF({ ...f, findingType: t.id })}
              >
                {t.label}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
        {findingTypeOf(f) === 'plaque' ? (
          <Section title="Plaque">
            <ChipScroller>
              {PLAQUE_GRADES.map((g) => (
                <Chip
                  key={g}
                  selected={f.plaqueGrade === g}
                  onClick={() =>
                    setF({
                      ...f,
                      plaqueGrade: f.plaqueGrade === g ? undefined : g,
                    })
                  }
                >
                  {g === 'other' ? 'Other' : g}
                </Chip>
              ))}
            </ChipScroller>
            {f.plaqueGrade === 'other' ? (
              <div className="relative">
                <Input
                  placeholder="e.g. 30"
                  value={f.plaqueOther ?? ''}
                  onChange={(e) => setF({ ...f, plaqueOther: e.target.value })}
                  className="pr-10"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                  %
                </span>
              </div>
            ) : null}
          </Section>
        ) : findingTypeOf(f) === 'normal' ? null : (
          <PercentFields
            title={findingTypeOf(f) === 'lesion' ? 'Lesion' : 'Stenosis'}
            f={f}
            setF={setF}
          />
        )}
        {findingTypeOf(f) === 'normal' ? null : (
          <Section title="Features">
            <ChipScroller>
              {ANGIO_FEATURES.map((feat) => (
                <Chip
                  key={feat}
                  selected={f.features.includes(feat)}
                  onClick={() => toggleFeature(feat)}
                >
                  {featureLabel(feat)}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        )}
        {hideNotes ? null : showsLadBranchNotes(f.vessel, f.segment) ? (
          <Section title="Notes">
            <ChipScroller>
              {LAD_BRANCHES.map((b) => (
                <Chip
                  key={b.id}
                  selected={f.ladBranch === b.id}
                  onClick={() =>
                    setF({ ...f, ladBranch: f.ladBranch === b.id ? undefined : (b.id as LadBranch) })
                  }
                >
                  {b.label}
                </Chip>
              ))}
            </ChipScroller>
            <ChipScroller>
              {LAD_INVOLVEMENTS.map((n) => (
                <Chip
                  key={n.id}
                  selected={f.ladInvolvement === n.id}
                  onClick={() =>
                    setF({
                      ...f,
                      ladInvolvement: f.ladInvolvement === n.id ? undefined : (n.id as LadInvolvement),
                    })
                  }
                >
                  {n.label}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : showsLcxBranchNotes(f.vessel, f.segment) ? (
          <Section title="Notes">
            <ChipScroller>
              {LCX_BRANCHES.map((b) => (
                <Chip
                  key={b.id}
                  selected={f.lcxBranch === b.id}
                  onClick={() =>
                    setF({ ...f, lcxBranch: f.lcxBranch === b.id ? undefined : (b.id as LcxBranch) })
                  }
                >
                  {b.label}
                </Chip>
              ))}
            </ChipScroller>
            <ChipScroller>
              {LAD_INVOLVEMENTS.map((n) => (
                <Chip
                  key={n.id}
                  selected={f.lcxInvolvement === n.id}
                  onClick={() =>
                    setF({
                      ...f,
                      lcxInvolvement: f.lcxInvolvement === n.id ? undefined : (n.id as LadInvolvement),
                    })
                  }
                >
                  {n.label}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : asSegments(f.segment).includes('distal') ? (
          <Section title="Notes">
            <ChipScroller>
              {(f.vessel === 'RCA' ? RCA_DISTAL_NOTES : DISTAL_SEGMENT_NOTES).map((n) => (
                <Chip
                  key={n}
                  selected={(f.distalNote ?? '') === n}
                  onClick={() => setF({ ...f, distalNote: f.distalNote === n ? '' : n })}
                >
                  {n}
                </Chip>
              ))}
            </ChipScroller>
            {f.distalNote === 'Other' ? (
              <Input
                placeholder="Enter note"
                value={f.distalNoteCustom ?? ''}
                onChange={(e) => setF({ ...f, distalNoteCustom: e.target.value })}
              />
            ) : null}
          </Section>
        ) : null}
        <Section title="TIMI flow">
          <ChipScroller>
            <Chip
              selected={!hasTimiFlow(f)}
              onClick={() => setF({ ...f, timiFlow: 'none' })}
            >
              None
            </Chip>
            {([0, 1, 2, 3] as TimiFlow[]).map((t) => (
              <Chip key={t} selected={f.timiFlow === t} onClick={() => setF({ ...f, timiFlow: t })}>
                TIMI {t === 0 ? '0' : t === 1 ? 'I' : t === 2 ? 'II' : 'III'}
              </Chip>
            ))}
          </ChipScroller>
        </Section>
          </>
        )}
        <Switch
          label="Target vessel"
          checked={f.isTarget}
          onChange={(isTarget) => setF({ ...f, isTarget })}
        />
      </div>
    </BottomSheet>
  )
}
