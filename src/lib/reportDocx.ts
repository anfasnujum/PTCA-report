import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import {
  cagAdviceSentence,
  cagArterialGraftLine,
  cagImpressionSentence,
  DISCLAIMER,
  fmtDisplayDate,
} from '@/lib/format'
import { mainVesselParagraph } from '@/lib/noteTemplate'
import type { Procedure } from '@/types/procedure'

const MONO_FONT = 'Courier New'

const SECTION_HEADERS = new Set([
  'ACCESS',
  'CORONARY ANGIOGRAM',
  'PROCEDURE',
  'RESULT',
  'PERIPROCEDURAL',
  'CLOSURE',
  'IMPRESSION',
  'ADVICE',
  'NOTES',
  'FINAL',
])

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, font: MONO_FONT, size: 28 })],
  })
}

function sectionHeaderParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, font: MONO_FONT, size: 22 })],
  })
}

function disclaimerParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({ text, italics: true, font: MONO_FONT, size: 18 })],
  })
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: MONO_FONT, size: 21 })],
  })
}

function spacerParagraph(): Paragraph {
  return new Paragraph({ children: [] })
}

export async function buildReportDocx(procedure: Procedure, noteText: string): Promise<Blob> {
  const lines = noteText.split('\n')
  const paragraphs: Paragraph[] = []
  let titleUsed = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      paragraphs.push(spacerParagraph())
      continue
    }

    if (!titleUsed) {
      paragraphs.push(titleParagraph(line))
      titleUsed = true
      continue
    }

    if (line === DISCLAIMER) {
      paragraphs.push(disclaimerParagraph(line))
      continue
    }

    if (SECTION_HEADERS.has(line)) {
      paragraphs.push(sectionHeaderParagraph(line))
      continue
    }

    paragraphs.push(bodyParagraph(rawLine))
  }

  const kindLabel = procedure.kind === 'cag' ? 'CAG' : 'PTCA'
  const doc = new Document({
    title: `${kindLabel} procedure note`,
    sections: [{ children: paragraphs }],
  })

  return Packer.toBlob(doc)
}

const ROW_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' }
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

function cell(text: string, opts?: { width?: number; top?: boolean; bottom?: boolean }): TableCell {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: {
      top: opts?.top ? ROW_BORDER : NO_BORDER,
      bottom: opts?.bottom ? ROW_BORDER : NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
    },
    margins: { top: 20, bottom: 20, left: 100, right: 100 },
    children: [new Paragraph({ spacing: { line: 216 }, children: [new TextRun({ text, size: 18 })] })],
  })
}

function fieldCell(
  label: string,
  value: string,
  opts?: { top?: boolean; bottom?: boolean },
): TableCell {
  return cell(`${label} : ${value || '____'}`, { width: 25, top: opts?.top, bottom: opts?.bottom })
}

function fieldRow(
  fields: Array<[string, string]>,
  opts: { top?: boolean; bottom?: boolean },
): TableRow {
  return new TableRow({
    children: fields.map(([label, value]) => fieldCell(label, value, opts)),
  })
}

function cagTitleParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40, line: 216 },
    children: [new TextRun({ text: 'CORONARY ANGIOGRAPHY REPORT', bold: true, size: 32 })],
  })
}

function cagConsultantParagraph(doctorName: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } },
    spacing: { after: 80, line: 216 },
    children: [
      new TextRun({ text: 'Consultant: ', bold: true, size: 26 }),
      new TextRun({ text: doctorName || '____', size: 26 }),
    ],
  })
}

function cagFindingParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20, line: 216 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 24 }),
      new TextRun({ text: value, size: 24 }),
    ],
  })
}

function cagPlainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20, line: 216 },
    children: [new TextRun({ text, size: 24 })],
  })
}

export async function buildCagReportDocx(procedure: Procedure): Promise<Blob> {
  const p = procedure
  const lmca = mainVesselParagraph(p.baselineAngio, 'LMCA')
  const lad = mainVesselParagraph(p.baselineAngio, 'LAD')
  const lcx = mainVesselParagraph(p.baselineAngio, 'LCX')
  const rca = mainVesselParagraph(p.baselineAngio, 'RCA')
  const limaLine = cagArterialGraftLine('LIMA', p.cagLimaOn, p.cagLimaNote)
  const rimaLine = cagArterialGraftLine('RIMA', p.cagRimaOn, p.cagRimaNote)
  const impression = cagImpressionSentence(p.cagImpressions, p.cagCustomImpressions)
  const advice = cagAdviceSentence(p.cagAdvices, p.cagCustomAdvices)
  const aorticPressure = p.lab.aorticPressureMmHg ? `${p.lab.aorticPressureMmHg} mmHg` : ''
  const lvedp = p.lab.lvedp ? `${p.lab.lvedp} mmHg` : ''
  const hasExtraHaemo = Boolean(p.lab.haemodynamicData.trim() || aorticPressure || lvedp)

  const patientTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TableBorders.NONE,
    rows: [
      fieldRow(
        [
          ['Name', p.patient.name.toUpperCase()],
          ['Age', p.patient.age === '' ? '' : String(p.patient.age)],
          ['Sex', p.patient.sex],
          ['Cath no', p.patient.hospitalId],
        ],
        {},
      ),
      fieldRow(
        [
          ['Date', fmtDisplayDate(p.patient.date)],
          ['Cath Tech', p.lab.technologist],
          ['IP No', p.patient.ipNo],
          ['Scrub nurse', p.lab.scrubNurse],
        ],
        {},
      ),
    ],
  })

  const labRows = [
    fieldRow(
      [
        ['Inventory', p.lab.inventory],
        ['Access', p.lab.access],
        ['Catheter', p.lab.catheter],
        ['Contrast', p.lab.contrast],
      ],
      { top: true, bottom: !hasExtraHaemo },
    ),
  ]
  if (hasExtraHaemo) {
    labRows.push(
      new TableRow({
        children: [
          fieldCell('Haemodynamic Data', p.lab.haemodynamicData, { bottom: true }),
          fieldCell('Aortic Pressure', aorticPressure, { bottom: true }),
          fieldCell('LVEDP', lvedp, { bottom: true }),
          cell('', { bottom: true }),
        ],
      }),
    )
  }
  const labTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TableBorders.NONE,
    rows: labRows,
  })

  const children: (Paragraph | Table)[] = [
    cagTitleParagraph(),
    cagConsultantParagraph(p.lab.doctorName),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    patientTable,
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    labTable,
    new Paragraph({ spacing: { before: 80, after: 20 }, children: [] }),
    cagFindingParagraph('LMCA', lmca),
    cagFindingParagraph('LAD', lad),
  ]
  if (limaLine) children.push(cagPlainParagraph(limaLine))
  children.push(cagFindingParagraph('LCX', lcx))
  if (rimaLine) children.push(cagPlainParagraph(rimaLine))
  children.push(
    cagFindingParagraph('RCA', rca),
    cagFindingParagraph('IMPRESSION', impression),
    cagFindingParagraph('ADVICE', advice),
  )
  if (p.notes.trim()) children.push(cagFindingParagraph('FINAL', p.notes.trim()))

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120 },
      children: [new TextRun({ text: p.lab.doctorName || '____', bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'Consultant Interventional Cardiologist & Asst. Professor', size: 20 }),
      ],
    }),
  )

  const doc = new Document({
    title: 'CAG procedure note',
    sections: [
      {
        properties: {
          page: { margin: { top: convertMillimetersToTwip(60) } },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}
