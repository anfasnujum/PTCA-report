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
  cagAdviceItems,
  cagArterialGraftLine,
  cagImpressionItems,
  DISCLAIMER,
  fmtDisplayDate,
} from '@/lib/format'
import { accessNarrative, accessSpecialNote } from '@/lib/access'
import { mainVesselParagraph, procedureSection } from '@/lib/noteTemplate'
import {
  ptcaAdjuvantsText,
  ptcaCommentSentence,
  ptcaComplicationsText,
  ptcaContrastText,
  ptcaHemodynamicText,
  ptcaInventoryLines,
  ptcaInventorySummary,
  ptcaResultLabel,
  ptcaTitle,
  targetVesselsShort,
} from '@/lib/ptcaReport'
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
    compatabilityModeVersion: 12,
    sections: [{ children: paragraphs }],
  })

  return Packer.toBlob(doc)
}

const ROW_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' }
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const REPORT_FONT = 'Times New Roman'

function cell(
  text: string,
  opts?: { width?: number; top?: boolean; bottom?: boolean; size?: number },
): TableCell {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: {
      top: opts?.top ? ROW_BORDER : NO_BORDER,
      bottom: opts?.bottom ? ROW_BORDER : NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
    },
    margins: { top: 20, bottom: 20, left: 100, right: 100 },
    children: [
      new Paragraph({
        spacing: { line: 216 },
        children: [new TextRun({ text, size: opts?.size ?? 18, font: REPORT_FONT })],
      }),
    ],
  })
}

function fieldCell(
  label: string,
  value: string,
  opts?: { top?: boolean; bottom?: boolean; size?: number },
): TableCell {
  return cell(label ? `${label} : ${value || '____'}` : '', {
    width: 25,
    top: opts?.top,
    bottom: opts?.bottom,
    size: opts?.size,
  })
}

function fieldRow(
  fields: Array<[string, string]>,
  opts: { top?: boolean; bottom?: boolean; size?: number },
): TableRow {
  return new TableRow({
    children: fields.map(([label, value]) => fieldCell(label, value, opts)),
  })
}

function fieldLineRow(
  label: string,
  value: string,
  opts: { top?: boolean; bottom?: boolean; tabs?: number },
): TableRow {
  const tabTwips = 720
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: opts.top ? ROW_BORDER : NO_BORDER,
          bottom: opts.bottom ? ROW_BORDER : NO_BORDER,
          left: NO_BORDER,
          right: NO_BORDER,
        },
        margins: { top: 20, bottom: 20, left: 100, right: 100 },
        children: [
          new Paragraph({
            indent: opts.tabs ? { left: opts.tabs * tabTwips } : undefined,
            spacing: { line: 216 },
            children: [
              new TextRun({
                text: `${label} : ${value || '____'}`,
                size: 18,
                font: REPORT_FONT,
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function fieldPairRow(
  left: [string, string],
  right: [string, string],
  opts: { top?: boolean; bottom?: boolean; tabs?: number },
): TableRow {
  const tabTwips = 720
  const pairCell = (label: string, value: string, indentLeft: boolean) =>
    new TableCell({
      columnSpan: 2,
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: {
        top: opts.top ? ROW_BORDER : NO_BORDER,
        bottom: opts.bottom ? ROW_BORDER : NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
      },
      margins: { top: 20, bottom: 20, left: 100, right: 100 },
      children: [
        new Paragraph({
          indent: indentLeft && opts.tabs ? { left: opts.tabs * tabTwips } : undefined,
          spacing: { line: 216 },
          children: [
            new TextRun({
              text: `${label} : ${value || '____'}`,
              size: 18,
              font: REPORT_FONT,
            }),
          ],
        }),
      ],
    })
  return new TableRow({
    children: [pairCell(left[0], left[1], true), pairCell(right[0], right[1], false)],
  })
}

function cagTitleParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40, line: 216 },
    children: [new TextRun({ text: 'CORONARY ANGIOGRAPHY REPORT', bold: true, size: 32, font: REPORT_FONT })],
  })
}

function cagConsultantParagraph(doctorName: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } },
    spacing: { after: 80, line: 216 },
    children: [
      new TextRun({ text: 'Consultant: ', bold: true, size: 26, font: REPORT_FONT }),
      new TextRun({ text: doctorName || '____', size: 26, font: REPORT_FONT }),
    ],
  })
}

function cagFindingParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20, line: 216 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 24, font: REPORT_FONT }),
      new TextRun({ text: value, size: 24, font: REPORT_FONT }),
    ],
  })
}

function cagBulletParagraphs(label: string, items: string[]): Paragraph[] {
  if (!items.length) {
    return [
      new Paragraph({
        spacing: { after: 20, line: 216 },
        children: [
          new TextRun({ text: `${label} : `, bold: true, size: 24, font: REPORT_FONT }),
          new TextRun({ text: 'Not recorded.', size: 24, font: REPORT_FONT }),
        ],
      }),
    ]
  }
  return [
    new Paragraph({
      spacing: { after: 20, line: 216 },
      children: [new TextRun({ text: `${label} :`, bold: true, size: 24, font: REPORT_FONT })],
    }),
    ...items.map(
      (item) =>
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 20, line: 216 },
          children: [new TextRun({ text: `• ${item}`, size: 24, font: REPORT_FONT })],
        }),
    ),
  ]
}

function cagPlainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20, line: 216 },
    children: [new TextRun({ text, size: 24, font: REPORT_FONT })],
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
  const impressionItems = cagImpressionItems(p.cagImpressions, p.cagCustomImpressions)
  const adviceItems = cagAdviceItems(p.cagAdvices, p.cagCustomAdvices)
  const aorticPressure = p.lab.aorticPressureMmHg.trim()
    ? /mm\s*hg$/i.test(p.lab.aorticPressureMmHg.trim())
      ? p.lab.aorticPressureMmHg.trim()
      : `${p.lab.aorticPressureMmHg.trim()} mmHg`
    : ''
  const specialNotes = accessSpecialNote(p.access)

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
    fieldLineRow('Access', accessNarrative(p.access), { top: true, bottom: false, tabs: 4 }),
    ...(specialNotes ? [fieldLineRow('Special Notes', specialNotes, { top: false, bottom: false, tabs: 5 })] : []),
    fieldLineRow('Catheter', p.lab.catheter, { top: false, bottom: false, tabs: 4 }),
    fieldLineRow('Contrast', p.lab.contrast, { top: false, bottom: false, tabs: 4 }),
    fieldPairRow(
      ['Haemodynamic Data', p.lab.haemodynamicData],
      ['Aortic Pressure', aorticPressure],
      { top: false, bottom: true, tabs: 2 },
    ),
  ]
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
    ...cagBulletParagraphs('IMPRESSION', impressionItems),
    ...cagBulletParagraphs('ADVICE', adviceItems),
  )
  if (p.notes.trim()) children.push(cagFindingParagraph('FINAL', p.notes.trim()))

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120 },
      children: [new TextRun({ text: p.lab.doctorName || '____', bold: true, size: 24, font: REPORT_FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Consultant Interventional Cardiologist & Asst. Professor',
          size: 20,
          font: REPORT_FONT,
        }),
      ],
    }),
  )

  const doc = new Document({
    title: 'CAG procedure note',
    compatabilityModeVersion: 12,
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

function ptcaTitleParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40, line: 216 },
    children: [new TextRun({ text, underline: {}, size: 32, font: REPORT_FONT })],
  })
}

function ptcaConsultantParagraph(doctorName: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80, line: 216 },
    children: [new TextRun({ text: `Consultant: ${doctorName || '____'}`, bold: true, size: 24, font: REPORT_FONT })],
  })
}

function ptcaBoldLineParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20, line: 216 },
    children: [new TextRun({ text: `${label} : ${value}`, bold: true, size: 24, font: REPORT_FONT })],
  })
}

function ptcaPlainLineParagraph(label: string, value: string, indent = false): Paragraph {
  return new Paragraph({
    indent: indent ? { left: 400 } : undefined,
    spacing: { after: 20, line: 216 },
    children: [new TextRun({ text: `${label} : ${value}`, size: 24, font: REPORT_FONT })],
  })
}

export async function buildPtcaReportDocx(procedure: Procedure): Promise<Blob> {
  const p = procedure
  const inventoryLines = ptcaInventoryLines(p)

  const patientTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TableBorders.NONE,
    rows: [
      fieldRow(
        [
          ['Name', p.patient.name.toUpperCase()],
          ['Age', p.patient.age === '' ? '' : `${p.patient.age}/${p.patient.sex || '—'}`],
          ['IP No', p.patient.ipNo],
        ],
        { size: 24 },
      ),
      fieldRow(
        [
          ['Cath No', p.patient.hospitalId],
          ['Date', fmtDisplayDate(p.patient.date)],
          ['', ''],
        ],
        { size: 24 },
      ),
      fieldRow(
        [
          ['Cath Tech', p.lab.technologist],
          ['Scrub nurse', p.lab.scrubNurse],
          ['', ''],
        ],
        { size: 24 },
      ),
    ],
  })

  const children: (Paragraph | Table)[] = [
    ptcaTitleParagraph(ptcaTitle(p)),
    ptcaConsultantParagraph(p.lab.doctorName),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    patientTable,
    new Paragraph({ spacing: { before: 80, after: 20 }, children: [] }),
    ptcaPlainLineParagraph('Premedication', 'Nil'),
    ptcaPlainLineParagraph('Vascular Access', accessNarrative(p.access)),
    ...(accessSpecialNote(p.access)
      ? [ptcaPlainLineParagraph('Special Notes', accessSpecialNote(p.access))]
      : []),
    ptcaPlainLineParagraph('Target Vessel/lesions', targetVesselsShort(p)),
    ptcaBoldLineParagraph('Inventory', ptcaInventorySummary(p)),
    ...inventoryLines.map((line) => ptcaPlainLineParagraph(line.label, line.value, true)),
    new Paragraph({ spacing: { before: 80, after: 20 }, children: [] }),
    ptcaBoldLineParagraph('Result', ptcaResultLabel(p.outcome)),
    ptcaBoldLineParagraph('Complications', ptcaComplicationsText(p.outcome)),
    ptcaBoldLineParagraph('Adjuvants', ptcaAdjuvantsText(p.periprocedural)),
    ptcaBoldLineParagraph('Contrast', ptcaContrastText(p.periprocedural)),
    ptcaBoldLineParagraph('Hemodynamic Data', ptcaHemodynamicText(p.lab)),
    new Paragraph({ spacing: { before: 80, after: 20 }, children: [] }),
    new Paragraph({
      spacing: { after: 20, line: 216 },
      children: [new TextRun({ text: 'PROCEDURE:', bold: true, size: 24, font: REPORT_FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 160, line: 216 },
      children: [new TextRun({ text: procedureSection(p.events), size: 24, font: REPORT_FONT })],
    }),
    new Paragraph({
      spacing: { after: 160, line: 216 },
      children: [
        new TextRun({
          text: `COMMENT: ${p.notes.trim() || ptcaCommentSentence(p)}`,
          bold: true,
          size: 24,
          font: REPORT_FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120 },
      children: [new TextRun({ text: p.lab.doctorName || '____', bold: true, size: 24, font: REPORT_FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Consultant Interventional Cardiologist & Asst. Professor',
          size: 20,
          font: REPORT_FONT,
        }),
      ],
    }),
  ]

  const doc = new Document({
    title: 'PTCA procedure note',
    compatabilityModeVersion: 12,
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
