import { jsPDF } from 'jspdf'
import { buildCoronarySvg, TREE_VIEWBOX } from '@/lib/coronaryTree'
import {
  DISCLAIMER,
  VESSELS,
  VESSEL_LONG,
  fmtDisplayDate,
  formatSegments,
  findingNoteValue,
  formatFindingPhrase,
  isLadOtherSegment,
  hasTimiFlow,
  lmcaLengthLabel,
  ladLeadClause,
  lcxDominanceLabel,
  ramusSizeLabel,
  rcaLeadClause,
  vesselReportName,
  lmcaQualifierBits,
  timiRoman,
  sortFindingsByAnatomy,
} from '@/lib/format'
import type { AngioFinding, Procedure } from '@/types/procedure'

function svgToPng(svg: string, scale = 3): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = TREE_VIEWBOX.w * scale
      canvas.height = TREE_VIEWBOX.h * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not render coronary tree'))
    }
    img.src = url
  })
}

function patientLine(p: Procedure): string {
  const name = [p.patient.title, p.patient.name || 'Unnamed patient'].filter(Boolean).join(' ')
  const demo = [p.patient.age !== '' ? `${p.patient.age}` : '', p.patient.sex].filter(Boolean).join(' ')
  return [name, demo, p.patient.hospitalId, fmtDisplayDate(p.patient.date)].filter(Boolean).join('  ·  ')
}

function findingRows(findings: AngioFinding[]): AngioFinding[] {
  return VESSELS.flatMap((v) => sortFindingsByAnatomy(findings.filter((f) => f.vessel === v)))
}

export async function downloadAngioPdf(procedure: Procedure): Promise<void> {
  const showTarget = procedure.kind !== 'cag'
  const marked = findingRows(procedure.baselineAngio)
  const png = await svgToPng(buildCoronarySvg(procedure.baselineAngio, 'export', showTarget))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentW = pageW - margin * 2
  let y = 16

  const ensure = (need: number) => {
    if (y + need < pageH - 14) return
    doc.addPage()
    y = 16
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(45, 118, 111)
  doc.text('CathNote', margin, y)
  y += 7
  doc.setTextColor(16, 23, 42)
  doc.setFontSize(16)
  doc.text('Coronary angiogram', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 90, 108)
  doc.text(patientLine(procedure), margin, y)
  y += 5
  const extras = [
    procedure.dominance ? `Dominance: ${procedure.dominance}` : '',
    [procedure.mainOperator, procedure.assistantOperator].filter(Boolean).join(' / '),
  ].filter(Boolean)
  if (extras.length) {
    doc.text(extras.join('  ·  '), margin, y)
    y += 5
  }

  y += 3
  const imgH = contentW * (TREE_VIEWBOX.h / TREE_VIEWBOX.w)
  ensure(imgH + 8)
  doc.addImage(png, 'PNG', margin, y, contentW, imgH)
  y += imgH + 4
  doc.setFontSize(8)
  doc.setTextColor(147, 161, 183)
  doc.text(
    showTarget
      ? 'Only marked vessels are coloured and labelled. Grey branches were not logged. ★ = target.'
      : 'Only marked vessels are coloured and labelled. Grey branches were not logged.',
    margin,
    y,
  )
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(16, 23, 42)
  doc.text('Marked findings', margin, y)
  y += 6

  if (marked.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 90, 108)
    doc.text('No vessels have been marked yet.', margin, y)
    y += 8
  } else {
    const cols = showTarget
      ? ([
          { key: 'vessel', w: 22 },
          { key: 'loc', w: 32 },
          { key: 'sten', w: 28 },
          { key: 'timi', w: 18 },
          { key: 'feat', w: 58 },
          { key: 'tgt', w: 26 },
        ] as const)
      : ([
          { key: 'vessel', w: 24 },
          { key: 'loc', w: 36 },
          { key: 'sten', w: 30 },
          { key: 'timi', w: 20 },
          { key: 'feat', w: 70 },
        ] as const)
    const headers = showTarget
      ? ['Vessel', 'Segment', 'Finding', 'TIMI', 'Features', 'Target']
      : ['Vessel', 'Segment', 'Finding', 'TIMI', 'Features']
    const rowH = (lines: number) => Math.max(8, lines * 4.2 + 3)

    const drawHeader = () => {
      doc.setFillColor(242, 245, 249)
      doc.rect(margin, y, contentW, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(80, 90, 108)
      let x = margin + 2
      headers.forEach((h, i) => {
        doc.text(h, x, y + 5.2)
        x += cols[i].w
      })
      y += 8
    }

    drawHeader()

    for (const f of marked) {
      const loc = [
        formatSegments(f.segment) || f.segmentOther?.trim() || '—',
        findingNoteValue(f),
      ]
        .filter(Boolean)
        .join(' · ')
      const extras =
        f.vessel === 'LMCA'
          ? lmcaQualifierBits(f)
          : ladLeadClause(f)
            ? [ladLeadClause(f)]
            : lcxDominanceLabel(f)
              ? [lcxDominanceLabel(f)]
              : ramusSizeLabel(f)
                ? [ramusSizeLabel(f)]
                : rcaLeadClause(f)
                  ? [rcaLeadClause(f)]
                  : []
      const other = isLadOtherSegment(f)
      const features = other ? extras.join(', ') || '—' : [...extras, ...f.features].join(', ') || '—'
      const cells = [
        vesselReportName(f),
        loc,
        other ? f.segmentOther?.trim() || '—' : formatFindingPhrase(f),
        other ? '—' : hasTimiFlow(f) ? timiRoman(f.timiFlow) : '—',
        features,
        ...(showTarget ? [f.isTarget ? 'Yes' : '—'] : []),
      ]
      const wrapped = cells.map((c, i) => doc.splitTextToSize(c, cols[i].w - 3))
      const lines = Math.max(...wrapped.map((w) => w.length))
      const h = rowH(lines)
      ensure(h + 16)
      if (y < 20) drawHeader()
      doc.setDrawColor(227, 232, 240)
      doc.line(margin, y + h, margin + contentW, y + h)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(16, 23, 42)
      let x = margin + 2
      wrapped.forEach((text, i) => {
        doc.text(text, x, y + 4.6)
        x += cols[i].w
      })
      y += h
    }

    y += 6
    for (const f of marked) {
      const long = VESSEL_LONG[f.vessel]
      const bits = [
        lmcaLengthLabel(f) || ladLeadClause(f) || lcxDominanceLabel(f) || ramusSizeLabel(f) || rcaLeadClause(f) || null,
        `${vesselReportName(f)} (${long})`,
        formatSegments(f.segment) || f.segmentOther?.trim() || null,
        findingNoteValue(f) || null,
        isLadOtherSegment(f) ? null : formatFindingPhrase(f),
        !isLadOtherSegment(f) && hasTimiFlow(f) ? `TIMI ${timiRoman(f.timiFlow)}` : null,
        !isLadOtherSegment(f) && f.features.length ? f.features.join(', ') : null,
        showTarget && f.isTarget ? 'target vessel' : null,
      ].filter(Boolean)
      const line = bits.join(' · ')
      const split = doc.splitTextToSize(line, contentW)
      ensure(split.length * 4.4 + 2)
      doc.setFontSize(8)
      doc.setTextColor(80, 90, 108)
      doc.text(split, margin, y)
      y += split.length * 4.4
    }
  }

  ensure(10)
  y = Math.max(y + 6, pageH - 12)
  doc.setFontSize(7)
  doc.setTextColor(147, 161, 183)
  doc.text(DISCLAIMER, margin, y, { maxWidth: contentW })

  const stem = `Angio-${procedure.patient.hospitalId || procedure.patient.name || 'note'}-${procedure.patient.date || 'draft'}`
  doc.save(`${stem.replace(/[^\w.-]+/g, '_')}.pdf`)
}
