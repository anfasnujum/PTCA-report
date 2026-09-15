import { useState } from 'react'
import { Download, Plus } from 'lucide-react'
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
  defaultIssueJoin,
  DEFAULT_STENOSIS_RANGE,
  LEFT_VESSELS,
  lmcaLengthMode,
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
  formatSegments,
  featureLabel,
  formatStenosis,
  findingSeverity,
  findingTypeOf,
  findingIssueLabel,
  findingsForVessel,
  hasTimiFlow,
  sortFindingsByAnatomy,
  stenosisModeOf,
  stenosisRangeOf,
  STENOSIS_PRESETS,
  syncVesselMeta,
  timiRoman,
  vesselMetaFrom,
  worstFinding,
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

function emptyFinding(vessel: Vessel, existing: AngioFinding[] = []): AngioFinding {
  const siblings = existing.filter((f) => f.vessel === vessel)
  const prior = siblings[0]
  return {
    id: nid(),
    vessel,
    stenosis: 0,
    findingType: 'normal',
    timiFlow: 'none',
    features: [],
    isTarget: false,
    ...(prior ? vesselMetaFrom(prior) : {}),
  }
}

function vesselSummary(list: AngioFinding[]): string {
  if (!list.length) return 'tap'
  if (list.length === 1) {
    const f = list[0]
    if (isLadOtherSegment(f)) return f.segmentOther?.trim() || 'other'
    return `${formatDescribedFinding(f)}${hasTimiFlow(f) ? ` · T${timiRoman(f.timiFlow)}` : ''}`
  }
  return sortFindingsByAnatomy(list).map(findingIssueLabel).join(' · ')
}

export function AngioBoard({
  findings,
  onChange,
}: {
  findings: AngioFinding[]
  onChange: (next: AngioFinding[]) => void
}) {
  const [hubVessel, setHubVessel] = useState<Vessel | null>(null)
  const [editing, setEditing] = useState<{ finding: AngioFinding; fromHub: boolean } | null>(null)

  const open = (v: Vessel) => {
    const list = findingsForVessel(findings, v)
    if (list.length > 1) {
      setHubVessel(v)
      setEditing(null)
      return
    }
    setHubVessel(null)
    setEditing({ finding: list[0] ?? emptyFinding(v, findings), fromHub: false })
  }

  const persist = (f: AngioFinding): AngioFinding[] => {
    const rest = findings.filter((x) => x.id !== f.id)
    const next = syncVesselMeta([...rest, f], f)
    onChange(next)
    return next
  }

  const save = (f: AngioFinding, andAdd = false) => {
    const next = persist(f)
    if (andAdd) {
      setEditing({ finding: emptyFinding(f.vessel, next), fromHub: true })
      setHubVessel(null)
      return
    }
    if (editing?.fromHub || findingsForVessel(next, f.vessel).length > 1) {
      setEditing(null)
      setHubVessel(f.vessel)
      return
    }
    setEditing(null)
    setHubVessel(null)
  }

  const closeEditor = () => {
    if (editing?.fromHub) {
      setEditing(null)
      setHubVessel(editing.finding.vessel)
      return
    }
    setEditing(null)
    setHubVessel(null)
  }

  const clearEditing = () => {
    if (!editing) return
    const vessel = editing.finding.vessel
    const persisted = findings.some((x) => x.id === editing.finding.id)
    const next = persisted ? findings.filter((x) => x.id !== editing.finding.id) : findings
    if (persisted) onChange(next)
    const remaining = findingsForVessel(next, vessel)
    setEditing(null)
    setHubVessel(editing.fromHub || remaining.length > 1 ? vessel : null)
  }

  const renderGroup = (label: string, vessels: Vessel[]) => (
    <Section title={label}>
      <div className="grid grid-cols-3 gap-2">
        {vessels.map((v) => {
          const list = findingsForVessel(findings, v)
          const worst = worstFinding(list)
          return (
            <button
              key={v}
              type="button"
              onClick={() => open(v)}
              className={cn(
                'min-h-16 rounded-2xl border px-2 py-2 text-center',
                stenosisColor(worst ? findingSeverity(worst) : 0),
                list.some((f) => f.isTarget) && 'ring-2 ring-accent',
              )}
            >
              <div className="text-sm font-semibold">
                {v}
                {list.some((f) => f.omMajor) ? ' · Major' : ''}
                {list.some((f) => f.lcxParent) ? ' · Parent' : ''}
                {list.length > 1 ? ` · ${list.length}` : ''}
              </div>
              <div className="text-xs opacity-80 line-clamp-2">
                {vesselSummary(list)}
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
          key={editing.finding.id}
          finding={editing.finding}
          otherCount={findingsForVessel(findings, editing.finding.vessel).filter((f) => f.id !== editing.finding.id).length}
          onClose={closeEditor}
          onSave={(f) => save(f)}
          onAddAnother={(f) => save(f, true)}
          onClear={clearEditing}
        />
      ) : hubVessel ? (
        <VesselHubSheet
          vessel={hubVessel}
          findings={findingsForVessel(findings, hubVessel)}
          onClose={() => setHubVessel(null)}
          onEdit={(f) => setEditing({ finding: f, fromHub: true })}
          onAdd={() => setEditing({ finding: emptyFinding(hubVessel, findings), fromHub: true })}
          onJoinChange={(id, joinBefore) => {
            onChange(findings.map((f) => (f.id === id ? { ...f, joinBefore } : f)))
          }}
          onClearAll={() => {
            onChange(findings.filter((f) => f.vessel !== hubVessel))
            setHubVessel(null)
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
            color={interactiveStroke(worstFinding(findings.filter((f) => f.vessel === b.vessel)))}
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

function VesselHubSheet({
  vessel,
  findings,
  onClose,
  onEdit,
  onAdd,
  onJoinChange,
  onClearAll,
}: {
  vessel: Vessel
  findings: AngioFinding[]
  onClose: () => void
  onEdit: (f: AngioFinding) => void
  onAdd: () => void
  onJoinChange: (id: string, joinBefore: string) => void
  onClearAll: () => void
}) {
  const list = sortFindingsByAnatomy(findings)
  const title = vesselReportName(list[0] ?? { vessel })
  return (
    <BottomSheet
      open
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClearAll}>
            Clear all
          </Button>
          <Button className="flex-1" onClick={onAdd}>
            <Plus className="size-4" />
            Add issue
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Each issue is one segment. Tap a row to edit, or add another diseased segment.
        </p>
        {list.map((f, i) => (
          <div key={f.id} className="space-y-3">
            {i > 0 ? (
              <div className="flex items-center gap-2 px-1">
                <span className="h-px flex-1 bg-border" />
                <Input
                  aria-label="Connector"
                  value={f.joinBefore ?? defaultIssueJoin(i - 1)}
                  onChange={(e) => onJoinChange(f.id, e.target.value)}
                  className="min-h-9 max-w-[14rem] text-center text-sm"
                />
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onEdit(f)}
              className={cn(
                'w-full rounded-2xl border px-3 py-3 text-left',
                stenosisColor(findingSeverity(f)),
                f.isTarget && 'ring-2 ring-accent',
              )}
            >
              <div className="text-sm font-semibold">
                {isLadOtherSegment(f)
                  ? 'Other'
                  : formatSegments(f.segment) || 'No segment'}
                {f.isTarget ? ' · target' : ''}
              </div>
              <div className="text-xs opacity-80">
                {isLadOtherSegment(f)
                  ? f.segmentOther?.trim() || 'other'
                  : `${formatDescribedFinding(f)}${hasTimiFlow(f) ? ` · T${timiRoman(f.timiFlow)}` : ''}`}
              </div>
            </button>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

function FindingSheet({
  finding,
  otherCount,
  onClose,
  onSave,
  onAddAnother,
  onClear,
}: {
  finding: AngioFinding
  otherCount: number
  onClose: () => void
  onSave: (f: AngioFinding) => void
  onAddAnother: (f: AngioFinding) => void
  onClear: () => void
}) {
  const [f, setF] = useState(finding)
  const ladOther = isLadOtherSegment(f)
  const sheetTitle = (() => {
    const name = vesselReportName(f)
    if (otherCount > 0) {
      if (isLadOtherSegment(f)) return `${name} · other`
      const seg = formatSegments(f.segment)
      return seg ? `${name} · ${seg}` : `${name} · new issue`
    }
    return name
  })()
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
      title={sheetTitle}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClear}>
              {otherCount > 0 ? 'Remove issue' : 'Clear'}
            </Button>
            <Button className="flex-1" onClick={() => onSave(f)}>
              Save finding
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={() => onAddAnother(f)}>
            <Plus className="size-4" />
            Add another issue
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
          <>
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
            <Switch
              label="Parent"
              yesNo
              checked={!!f.lcxParent}
              onChange={(lcxParent) => setF({ ...f, lcxParent })}
            />
          </>
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
                  selected={asSegments(f.segment).includes(s)}
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
          {findingTypeOf(f) === 'other' ? (
            <Input
              placeholder="Enter finding"
              value={f.findingOther ?? ''}
              onChange={(e) => setF({ ...f, findingOther: e.target.value })}
            />
          ) : null}
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
        ) : findingTypeOf(f) === 'normal' ||
          findingTypeOf(f) === 'total-occlusion' ||
          findingTypeOf(f) === 'other' ? null : (
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
