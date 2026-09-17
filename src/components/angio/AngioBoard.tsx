import { useState } from 'react'
import { Download } from 'lucide-react'
import type { AngioFinding, LadBranch, LadInvolvement, LadVesselType, LcxBranch, LcxDominance, RamusSize, RcaDominance, TimiFlow, Vessel } from '@/types/procedure'
import { StenosisPicker } from '@/components/fields/StenosisPicker'
import { Chip, ChipScroller } from '@/components/ui/chip'
import { Combobox } from '@/components/ui/combobox'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ANGIO_FEATURES, BRIDGING_GRADES, DISTAL_SEGMENT_NOTES, FINDING_TYPES, LAD_BRANCHES, LAD_INVOLVEMENTS, LAD_VESSEL_TYPES, LCX_BRANCHES, LCX_DOMINANCE, PLAQUE_GRADES, RAMUS_SIZES, RCA_DISTAL_NOTES, RCA_DOMINANCE } from '@/lib/constants'
import { downloadAngioPdf } from '@/lib/angioPdf'
import { CORONARY_TREE, TREE_VIEWBOX, interactiveStroke } from '@/lib/coronaryTree'
import {
  asSegments,
  defaultIssueJoin,
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
  featureRemarkText,
  findingSeverity,
  findingTypeOf,
  findingIssueLabel,
  findingsForVessel,
  hasTimiFlow,
  sortFindingsByAnatomy,
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

function emptyFinding(
  vessel: Vessel,
  existing: AngioFinding[] = [],
  isTarget = false,
): AngioFinding {
  const siblings = existing.filter((f) => f.vessel === vessel)
  const prior = siblings[0]
  return {
    id: nid(),
    vessel,
    stenosis: 0,
    findingType: 'normal',
    timiFlow: 'none',
    features: [],
    isTarget,
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
  showTargetVessel = true,
}: {
  findings: AngioFinding[]
  onChange: (next: AngioFinding[]) => void
  showTargetVessel?: boolean
}) {
  const [openVessel, setOpenVessel] = useState<Vessel | null>(null)

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
              onClick={() => setOpenVessel(v)}
              className={cn(
                'min-h-16 rounded-2xl border px-2 py-2 text-center',
                stenosisColor(worst ? findingSeverity(worst) : 0),
                showTargetVessel && list.some((f) => f.isTarget) && 'ring-2 ring-accent',
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
        <CoronarySchematic onSelect={setOpenVessel} findings={findings} />
        <div className="space-y-5">
          {renderGroup('Left system', LEFT_VESSELS)}
          {renderGroup('Right system', RIGHT_VESSELS)}
        </div>
      </div>
      {openVessel ? (
        <VesselSheet
          vessel={openVessel}
          findings={findings}
          showTargetVessel={showTargetVessel}
          onChange={onChange}
          onClose={() => setOpenVessel(null)}
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

function issueRowTitle(f: AngioFinding): string {
  if (isLadOtherSegment(f)) return 'Other'
  return formatSegments(f.segment) || 'No segment'
}

function issueRowSubtitle(f: AngioFinding): string {
  if (isLadOtherSegment(f)) return f.segmentOther?.trim() || 'other'
  return `${formatDescribedFinding(f)}${hasTimiFlow(f) ? ` · T${timiRoman(f.timiFlow)}` : ''}`
}

function VesselSheet({
  vessel,
  findings,
  onChange,
  onClose,
  showTargetVessel,
}: {
  vessel: Vessel
  findings: AngioFinding[]
  onChange: (next: AngioFinding[]) => void
  onClose: () => void
  showTargetVessel: boolean
}) {
  const persistedList = sortFindingsByAnatomy(findingsForVessel(findings, vessel))
  const [selectedId, setSelectedId] = useState(
    () => persistedList[0]?.id ?? emptyFinding(vessel, findings).id,
  )
  const [draft, setDraft] = useState<AngioFinding>(
    () => persistedList.find((f) => f.id === selectedId) ?? emptyFinding(vessel, findings),
  )
  const draftIsNew = !persistedList.some((f) => f.id === draft.id)
  const sidebarIssues =
    draftIsNew && !persistedList.some((f) => f.id === selectedId)
      ? [...persistedList, draft]
      : persistedList
  const showSidebar = sidebarIssues.length > 1

  const persist = (f: AngioFinding): AngioFinding[] => {
    const rest = findings.filter((x) => x.id !== f.id)
    const next = syncVesselMeta([...rest, f], f)
    onChange(next)
    return next
  }

  const selectIssue = (f: AngioFinding) => {
    if (f.id === selectedId) return
    persist(draft)
    setSelectedId(f.id)
    setDraft(f)
  }

  const save = () => {
    persist(draft)
    onClose()
  }

  const addIssue = () => {
    const next = persist(draft)
    const empty = emptyFinding(vessel, next)
    setSelectedId(empty.id)
    setDraft(empty)
  }

  const removeIssue = () => {
    const persisted = findings.some((x) => x.id === draft.id)
    const next = persisted ? findings.filter((x) => x.id !== draft.id) : findings
    if (persisted) onChange(next)
    const remaining = sortFindingsByAnatomy(findingsForVessel(next, vessel))
    if (!remaining.length) {
      onClose()
      return
    }
    setSelectedId(remaining[0].id)
    setDraft(remaining[0])
  }

  const clearAll = () => {
    onChange(findings.filter((f) => f.vessel !== vessel))
    onClose()
  }

  const otherCount = persistedList.filter((f) => f.id !== draft.id).length
  const title = vesselReportName(persistedList[0] ?? draft)

  return (
    <BottomSheet
      open
      wide
      title={title}
      onClose={onClose}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3"
      footer={
        <div className="flex gap-2">
            <Button variant="secondary" className="shrink-0 px-3 sm:flex-1 sm:px-5" onClick={removeIssue}>
              {otherCount > 0 || showSidebar ? 'Remove issue' : 'Clear'}
            </Button>
            <Button className="min-w-0 flex-1 px-3 sm:px-5" onClick={save}>
              Save finding
            </Button>
            <Button
              variant="outline"
              className="min-w-0 flex-1 whitespace-normal px-3 text-center leading-tight sm:px-5"
              onClick={addIssue}
            >
              Save and Add another
            </Button>
        </div>
      }
    >
      {showSidebar ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:flex-row md:gap-0">
          <aside className="flex shrink-0 flex-col gap-2 md:w-48 md:min-h-0 md:border-r md:border-border md:pr-3">
            <div className="flex items-center justify-between gap-2 md:px-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Issues</p>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0">
              {sidebarIssues.map((f, i) => (
                <div key={f.id} className="shrink-0 space-y-2 md:w-full">
                  {i > 0 ? (
                    <div className="hidden items-center gap-1 px-1 md:flex">
                      <span className="h-px flex-1 bg-border" />
                      <Input
                        aria-label="Connector"
                        value={f.joinBefore ?? defaultIssueJoin(i - 1)}
                        onChange={(e) => {
                          onChange(
                            findings.map((x) =>
                              x.id === f.id ? { ...x, joinBefore: e.target.value } : x,
                            ),
                          )
                        }}
                        className="min-h-8 max-w-[5.5rem] text-center text-xs"
                      />
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => selectIssue(f)}
                    className={cn(
                      'w-36 rounded-2xl border px-3 py-2 text-left transition-colors md:w-full',
                      stenosisColor(findingSeverity(f)),
                      showTargetVessel && f.isTarget && 'ring-2 ring-accent',
                      f.id === selectedId && 'ring-2 ring-accent ring-offset-1',
                    )}
                  >
                    <div className="text-sm font-semibold">
                      {f.id === draft.id && draftIsNew ? 'New issue' : issueRowTitle(f)}
                      {showTargetVessel && f.isTarget ? ' · target' : ''}
                    </div>
                    <div className="text-xs opacity-80 line-clamp-2">
                      {f.id === draft.id && draftIsNew
                        ? 'unsaved'
                        : issueRowSubtitle(f)}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </aside>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain md:pl-5">
            <FindingForm f={draft} setF={setDraft} showTargetVessel={showTargetVessel} />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <FindingForm f={draft} setF={setDraft} showTargetVessel={showTargetVessel} />
        </div>
      )}
    </BottomSheet>
  )
}

function FindingForm({
  f,
  setF,
  showTargetVessel,
}: {
  f: AngioFinding
  setF: (next: AngioFinding) => void
  showTargetVessel: boolean
}) {
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
      <div className="space-y-4 [&_section]:space-y-2 [&_section_button]:min-h-8 [&_section_button]:px-3">
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
              <Combobox
                placeholder="Type or choose a feature"
                value={f.ladRemark ?? ''}
                onChange={(ladRemark) => setF({ ...f, ladRemark })}
                options={ANGIO_FEATURES.map((feat) => ({
                  value: featureRemarkText(feat),
                  label: featureLabel(feat),
                }))}
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
        ) : findingTypeOf(f) === 'myocardial-bridging' ? (
          <Section title="Bridging">
            <ChipScroller>
              {BRIDGING_GRADES.map((g) => (
                <Chip
                  key={g}
                  selected={f.bridgingGrade === g}
                  onClick={() =>
                    setF({
                      ...f,
                      bridgingGrade: f.bridgingGrade === g ? undefined : g,
                    })
                  }
                >
                  {g}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : findingTypeOf(f) === 'luminal-irregularities' ? (
          <Section title="Grade">
            <ChipScroller>
              {BRIDGING_GRADES.map((g) => (
                <Chip
                  key={g}
                  selected={f.luminalGrade === g}
                  onClick={() =>
                    setF({
                      ...f,
                      luminalGrade: f.luminalGrade === g ? undefined : g,
                    })
                  }
                >
                  {g}
                </Chip>
              ))}
            </ChipScroller>
          </Section>
        ) : findingTypeOf(f) === 'normal' ||
          findingTypeOf(f) === 'mildly-ectatic-vessel' ||
          findingTypeOf(f) === 'dissection' ||
          findingTypeOf(f) === 'total-occlusion' ||
          findingTypeOf(f) === 'other' ? null : (
          <StenosisPicker
            title={findingTypeOf(f) === 'lesion' ? 'Lesion' : 'Stenosis'}
            f={f}
            setF={setF}
          />
        )}
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
          </>
        )}
        {showTargetVessel ? (
          <Switch
            label="Target vessel"
            checked={f.isTarget}
            onChange={(isTarget) => setF({ ...f, isTarget })}
          />
        ) : null}
      </div>
  )
}
