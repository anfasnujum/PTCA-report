import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { Procedure } from '@/types/procedure'

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const REPORT_FONT = 'Times New Roman'
// A4 page width (11906 dxa) minus default 1" left/right margins (1440 dxa each).
// Absolute (dxa) widths are used instead of WidthType.PERCENTAGE — the docx library
// serializes percentage widths as a literal "N%" string, a representation some
// older Word versions' stricter OOXML schema validation rejects outright.
const PAGE_CONTENT_WIDTH_DXA = 11906 - 1440 - 1440

const LEGACY_FONT_SIZE_HALF_PT: Record<string, number> = {
  '1': 16,
  '2': 20,
  '3': 24,
  '4': 28,
  '5': 36,
  '6': 48,
  '7': 72,
}

type RunStyle = { bold?: boolean; italics?: boolean; underline?: boolean; size?: number }
type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType]
type BlockContext = { align?: Alignment; indent?: number; style: RunStyle; pageBreakBefore?: boolean }

export const REPORT_PAGE_BREAK_CLASS = 'report-page-break'

function hasClass(el: Element, name: string): boolean {
  return el.classList?.contains(name) ?? false
}

function isPageBreak(el: Element): boolean {
  return hasClass(el, REPORT_PAGE_BREAK_CLASS)
}

function inlineStyle(el: Element): CSSStyleDeclaration | undefined {
  return (el as HTMLElement).style
}

function pxToHalfPt(value: string | undefined): number | undefined {
  const m = value ? /^([\d.]+)px$/.exec(value.trim()) : null
  return m ? Math.round(parseFloat(m[1]) * 1.5) : undefined
}

function inlineFontSizeHalfPt(el: Element): number | undefined {
  // The layout annotates its intended .docx point size via a `--pt` custom property
  // (see `pt()` in CagReportLayout/PtcaReportLayout) — prefer that exact value over
  // deriving one from the on-screen pixel size, which is tuned separately for screen
  // legibility and isn't proportional to the print point sizes.
  const ptValue = inlineStyle(el)?.getPropertyValue('--pt')?.trim()
  if (ptValue) {
    const n = parseFloat(ptValue)
    if (!Number.isNaN(n)) return Math.round(n * 2)
  }
  return pxToHalfPt(inlineStyle(el)?.fontSize)
}

function styleAddsBold(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'b' || tag === 'strong') return true
  const fw = inlineStyle(el)?.fontWeight
  if (fw) {
    if (fw === 'bold' || fw === 'bolder') return true
    if (fw === 'normal' || fw === 'lighter') return false
    const n = Number(fw)
    if (!Number.isNaN(n)) return n >= 600
  }
  return hasClass(el, 'font-bold') || hasClass(el, 'font-semibold')
}

function styleAddsItalic(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'i' || tag === 'em') return true
  const fs = inlineStyle(el)?.fontStyle
  if (fs === 'italic' || fs === 'oblique') return true
  if (fs === 'normal') return false
  return hasClass(el, 'italic')
}

function styleAddsUnderline(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'u') return true
  const td = inlineStyle(el)?.textDecorationLine
  if (td && /underline/.test(td)) return true
  if (td === 'none') return false
  return hasClass(el, 'underline')
}

function elementAlignment(el: Element): Alignment | undefined {
  const ta = inlineStyle(el)?.textAlign
  if (ta === 'center') return AlignmentType.CENTER
  if (ta === 'right' || ta === 'end') return AlignmentType.RIGHT
  if (ta === 'justify') return AlignmentType.JUSTIFIED
  if (hasClass(el, 'text-center')) return AlignmentType.CENTER
  if (hasClass(el, 'text-right')) return AlignmentType.RIGHT
  if (hasClass(el, 'text-justify')) return AlignmentType.JUSTIFIED
  return undefined
}

function pxToTwips(value: string | undefined): number | undefined {
  const m = value ? /^([\d.]+)px$/.exec(value.trim()) : null
  return m ? Math.round(parseFloat(m[1]) * 15) : undefined
}

function inlineIndentTwips(el: Element): number | undefined {
  return pxToTwips(inlineStyle(el)?.paddingLeft)
}

function hasTopRule(el: Element): boolean {
  const w = inlineStyle(el)?.borderTopWidth
  return Boolean(w && w !== '0px')
}

function mergeContext(ctx: BlockContext, el: Element): BlockContext {
  const nextStyle: RunStyle = {
    bold: ctx.style.bold || styleAddsBold(el),
    italics: ctx.style.italics || styleAddsItalic(el),
    underline: ctx.style.underline || styleAddsUnderline(el),
    size: inlineFontSizeHalfPt(el) ?? ctx.style.size,
  }
  if (el.tagName.toLowerCase() === 'font') {
    const sizeAttr = el.getAttribute('size')
    if (sizeAttr && LEGACY_FONT_SIZE_HALF_PT[sizeAttr]) nextStyle.size = LEGACY_FONT_SIZE_HALF_PT[sizeAttr]
  }
  return {
    align: elementAlignment(el) ?? ctx.align,
    indent: inlineIndentTwips(el) ?? ctx.indent,
    style: nextStyle,
  }
}

function collectRuns(node: Node, style: RunStyle, runs: TextRun[]): void {
  if (node.nodeType === Node.ELEMENT_NODE && hasClass(node as Element, 'inventory-label-sizer')) {
    return
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (text) {
      runs.push(
        new TextRun({
          text,
          bold: style.bold,
          italics: style.italics,
          underline: style.underline ? {} : undefined,
          size: style.size ?? 24,
          font: REPORT_FONT,
        }),
      )
    }
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (tag === 'br') {
    runs.push(new TextRun({ text: '', break: 1, size: style.size ?? 24, font: REPORT_FONT }))
    return
  }
  if (tag === 'script' || tag === 'style') return
  const nextStyle = mergeContext({ style }, el).style
  for (const child of Array.from(el.childNodes)) {
    collectRuns(child, nextStyle, runs)
  }
}

function elementToTableCell(el: Element, style: RunStyle, widthDxa?: number): TableCell {
  const runs: TextRun[] = []
  collectRuns(el, style, runs)
  if (!runs.length) runs.push(new TextRun({ text: '', size: style.size ?? 24, font: REPORT_FONT }))
  return new TableCell({
    width: widthDxa ? { size: widthDxa, type: WidthType.DXA } : undefined,
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    margins: { top: 20, bottom: 20, left: 100, right: 100 },
    children: [new Paragraph({ children: runs })],
  })
}

function elementToTable(tableEl: Element, style: RunStyle): Table | null {
  const rows: TableRow[] = []
  const inventoryPair = hasClass(tableEl, 'inventory-pair')
  for (const tr of Array.from(tableEl.querySelectorAll('tr'))) {
    const cellEls = Array.from(tr.children).filter((c) => ['TD', 'TH'].includes(c.tagName))
    if (!cellEls.length) continue
    const widths =
      inventoryPair && cellEls.length === 3
        ? [3600, 280, PAGE_CONTENT_WIDTH_DXA - 3880]
        : inventoryPair && cellEls.length === 2
          ? [4000, PAGE_CONTENT_WIDTH_DXA - 4000]
          : cellEls.map(() => Math.floor(PAGE_CONTENT_WIDTH_DXA / cellEls.length))
    rows.push(
      new TableRow({
        children: cellEls.map((c, i) => elementToTableCell(c, style, widths[i])),
      }),
    )
  }
  if (!rows.length) return null
  return new Table({
    width: { size: PAGE_CONTENT_WIDTH_DXA, type: WidthType.DXA },
    borders: TableBorders.NONE,
    rows,
  })
}

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'header', 'footer'])

function walkBlocks(container: Node, ctx: BlockContext, out: (Paragraph | Table)[]): boolean {
  let pageBreakBefore = Boolean(ctx.pageBreakBefore)
  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as Element
    const tag = el.tagName.toLowerCase()

    if (tag === 'table') {
      if (pageBreakBefore) {
        out.push(new Paragraph({ pageBreakBefore: true, children: [] }))
        pageBreakBefore = false
      }
      const table = elementToTable(el, ctx.style)
      if (table) out.push(table)
      continue
    }
    if (tag === 'hr') {
      if (isPageBreak(el)) {
        pageBreakBefore = true
        continue
      }
      out.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
          children: [],
        }),
      )
      continue
    }
    if (CONTAINER_TAGS.has(tag)) {
      if (hasTopRule(el) && !isPageBreak(el)) {
        out.push(
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
            spacing: { before: 80 },
            children: [],
          }),
        )
      }
      const nestedCtx = mergeContext({ ...ctx, pageBreakBefore: false }, el)
      nestedCtx.pageBreakBefore = isPageBreak(el) || pageBreakBefore
      pageBreakBefore = walkBlocks(el, nestedCtx, out)
      continue
    }
    if (tag === 'ul' || tag === 'ol') {
      const listCtx = mergeContext(ctx, el)
      const liEls = Array.from(el.children).filter((c) => c.tagName === 'LI')
      liEls.forEach((li, i) => {
        const liCtx = mergeContext(listCtx, li)
        const prefix = tag === 'ol' ? `${i + 1}. ` : '• '
        const runs: TextRun[] = [
          new TextRun({ text: prefix, size: liCtx.style.size ?? 24, font: REPORT_FONT }),
        ]
        collectRuns(li, liCtx.style, runs)
        out.push(
          new Paragraph({
            pageBreakBefore: i === 0 ? pageBreakBefore : false,
            indent: { left: liCtx.indent ?? 360 },
            alignment: liCtx.align,
            spacing: { after: 40, line: 216 },
            children: runs,
          }),
        )
        pageBreakBefore = false
      })
      continue
    }
    if (BLOCK_TAGS.has(tag) || el.textContent?.trim()) {
      const nextCtx = mergeContext(ctx, el)
      const runs: TextRun[] = []
      collectRuns(el, nextCtx.style, runs)
      const breakBefore = pageBreakBefore || isPageBreak(el)
      if (runs.length) {
        out.push(
          new Paragraph({
            pageBreakBefore: breakBefore,
            alignment: nextCtx.align,
            indent: nextCtx.indent ? { left: nextCtx.indent } : undefined,
            spacing: { after: 40, line: 216 },
            children: runs,
          }),
        )
        pageBreakBefore = false
      } else if (isPageBreak(el)) {
        pageBreakBefore = true
      }
    }
  }
  return pageBreakBefore
}

export function htmlToDocxChildren(html: string): (Paragraph | Table)[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: (Paragraph | Table)[] = []
  walkBlocks(doc.body, { style: { size: 24 } }, out)
  return out.length ? out : [new Paragraph({ children: [] })]
}

export async function buildReportDocxFromHtml(procedure: Procedure, html: string): Promise<Blob> {
  const children = htmlToDocxChildren(html)
  const title = procedure.kind === 'cag' ? 'CAG procedure note' : 'PTCA procedure note'
  const doc = new Document({
    title,
    creator: 'CathNote',
    description: title,
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
