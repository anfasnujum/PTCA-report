import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CagReportLayout } from '@/components/preview/CagReportLayout'
import { PtcaReportLayout } from '@/components/preview/PtcaReportLayout'
import { generateNote } from '@/lib/noteTemplate'
import { buildReportDocxFromHtml } from '@/lib/reportDocx'
import { useProcedureStore } from '@/store/useProcedureStore'
import { cn } from '@/lib/utils'
import { isLockedProcedure } from '@/lib/homeList'
import { Bold, Check, Copy, Download, Italic, Printer, RotateCcw, Share2, Underline } from 'lucide-react'

function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadBlob(filename: string, text: string, mime: string) {
  downloadBlobFile(filename, new Blob([text], { type: mime }))
}

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 32]

type FormatState = { bold: boolean; italic: boolean; underline: boolean; fontSize: string }

function EditorToolbar({
  format,
  onFormat,
  onFontSize,
}: {
  format: FormatState
  onFormat: (command: 'bold' | 'italic' | 'underline') => void
  onFontSize: (value: string) => void
}) {
  const isPreset = format.fontSize !== '' && FONT_SIZES.includes(Number(format.fontSize))
  const [customMode, setCustomMode] = useState(format.fontSize !== '' && !isPreset)
  const [sizeInput, setSizeInput] = useState(format.fontSize)

  useEffect(() => {
    const preset = format.fontSize !== '' && FONT_SIZES.includes(Number(format.fontSize))
    setCustomMode(format.fontSize !== '' && !preset)
    setSizeInput(format.fontSize)
  }, [format.fontSize])

  const commitCustomSize = () => {
    const trimmed = sizeInput.trim()
    if (trimmed && trimmed !== format.fontSize) {
      onFontSize(trimmed)
    } else {
      setSizeInput(format.fontSize)
    }
  }

  return (
    <div className="no-print ml-auto flex w-fit items-center gap-1 rounded-xl bg-card p-1 shadow-card">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Bold"
        className={cn(format.bold && 'bg-accent-soft text-accent')}
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat('bold')
        }}
      >
        <Bold className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Italic"
        className={cn(format.italic && 'bg-accent-soft text-accent')}
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat('italic')
        }}
      >
        <Italic className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Underline"
        className={cn(format.underline && 'bg-accent-soft text-accent')}
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat('underline')
        }}
      >
        <Underline className="size-4" />
      </Button>
      {customMode ? (
        <input
          type="number"
          min={1}
          autoFocus
          className="min-h-9 w-16 rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-accent/40"
          title="Custom font size"
          placeholder="Aa"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          onBlur={commitCustomSize}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitCustomSize()
            } else if (e.key === 'Escape') {
              setCustomMode(false)
              setSizeInput(format.fontSize)
            }
          }}
        />
      ) : (
        <select
          className="min-h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-accent/40"
          title="Font size"
          value={format.fontSize}
          onChange={(e) => {
            const value = e.target.value
            if (value === 'custom') {
              setSizeInput('')
              setCustomMode(true)
              return
            }
            if (!value) return
            onFontSize(value)
          }}
        >
          <option value="" disabled>
            Aa
          </option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
      )}
    </div>
  )
}

function bakeComputedStyles(live: Element, clone: Element) {
  const cs = window.getComputedStyle(live)
  const el = clone as HTMLElement
  el.style.fontSize = cs.fontSize
  el.style.fontWeight = cs.fontWeight
  el.style.fontStyle = cs.fontStyle
  el.style.textDecorationLine = cs.textDecorationLine || cs.textDecoration
  el.style.textAlign = cs.textAlign
  if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') {
    el.style.borderTopWidth = cs.borderTopWidth
    el.style.borderTopStyle = cs.borderTopStyle
  }
  if (parseFloat(cs.paddingLeft) > 0) {
    el.style.paddingLeft = cs.paddingLeft
  }
  // Carries the layout's intended .docx point size (set via the `pt()` helper in
  // CagReportLayout/PtcaReportLayout), independent of the on-screen pixel size.
  const docxPt = cs.getPropertyValue('--pt').trim()
  if (docxPt) el.style.setProperty('--pt', docxPt)
  const liveChildren = live.children
  const cloneChildren = clone.children
  for (let i = 0; i < liveChildren.length; i++) {
    bakeComputedStyles(liveChildren[i], cloneChildren[i])
  }
}

function htmlToText(html: string): string {
  if (!html.trim()) return ''
  const withBreaks = html
    .replace(/<\/(p|div|tr|td|th|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html')
  const text = doc.body.textContent ?? ''
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function PreviewPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const setStatus = useProcedureStore((s) => s.setStatus)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: '',
  })
  const docRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const editStartHtmlRef = useRef<string | null>(null)

  const generated = useMemo(() => (current ? generateNote(current) : ''), [current])
  const overrideText = useMemo(() => htmlToText(current?.docOverride ?? ''), [current])
  const note = current?.docOverride?.trim() ? overrideText : generated

  if (!current) return null

  const isCag = current.kind === 'cag'
  const kindLabel = isCag ? 'CAG' : 'PTCA'
  const stem = `${kindLabel}-${current.patient.hospitalId || current.patient.name || 'note'}-${current.patient.date}`
  const hasOverride = Boolean(current.docOverride)

  const copy = async () => {
    await navigator.clipboard.writeText(note)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: isCag ? 'CAG procedure note' : 'PTCA procedure note',
        text: note,
      })
      return
    }
    await copy()
  }

  const exportDocx = async () => {
    if (!docRef.current) return
    setExportingDocx(true)
    try {
      // Always derive the .docx from what's actually rendered on screen (baking
      // computed styles the same way an edit-commit does), so a freshly generated
      // export and a hand-edited one are built through the exact same pipeline and
      // can never drift apart.
      const clone = docRef.current.cloneNode(true) as HTMLElement
      bakeComputedStyles(docRef.current, clone)
      const blob = await buildReportDocxFromHtml(current, clone.innerHTML)
      downloadBlobFile(`${stem}.docx`, blob)
    } finally {
      setExportingDocx(false)
    }
  }

  const commitEdit = () => {
    if (editing && docRef.current) {
      const rawHtml = docRef.current.innerHTML
      if (rawHtml !== editStartHtmlRef.current) {
        const clone = docRef.current.cloneNode(true) as HTMLElement
        bakeComputedStyles(docRef.current, clone)
        mutate((p) => ({ ...p, docOverride: clone.innerHTML }))
      }
    }
  }

  const toggleEditing = () => {
    if (editing) {
      commitEdit()
    } else {
      editStartHtmlRef.current = docRef.current?.innerHTML ?? null
    }
    setEditing((e) => !e)
  }

  const regenerate = () => {
    mutate((p) => ({ ...p, docOverride: undefined }))
    setEditing(false)
  }

  const locked = isLockedProcedure(current)

  const toggleFinalised = () => {
    commitEdit()
    setEditing(false)
    setStatus(locked ? 'draft' : 'finalised')
  }

  const toggleCompleted = () => {
    commitEdit()
    setEditing(false)
    setStatus(current.status === 'completed' ? 'finalised' : 'completed')
  }

  const detectFormatState = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !docRef.current?.contains(sel.anchorNode)) {
      return
    }
    const node = sel.anchorNode
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
    let fontSize = ''
    if (el) {
      const px = Math.round(parseFloat(window.getComputedStyle(el).fontSize))
      if (Number.isFinite(px)) fontSize = String(px)
    }
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      fontSize,
    })
  }

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.anchorNode && docRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
    detectFormatState()
  }

  const applyFormat = (command: 'bold' | 'italic' | 'underline') => {
    document.execCommand(command)
    detectFormatState()
  }

  const applyFontSize = (value: string) => {
    const sel = window.getSelection()
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
    // Legacy execCommand only supports sizes 1-7, so apply a marker size and
    // replace it with the real pixel value to get an actual font-size.
    document.execCommand('fontSize', false, '7')
    docRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
      const font = el as HTMLElement
      font.removeAttribute('size')
      font.style.fontSize = `${value}px`
    })
    docRef.current?.focus()
    // execCommand rewraps the selected nodes, so the previously saved range
    // may now point at detached nodes. Recapture it so the next size change
    // (without reselecting text) still has a valid range to restore.
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
    detectFormatState()
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          disabled={locked}
          onClick={toggleEditing}
        >
          {editing ? 'Done' : 'Edit in place'}
        </Button>
        <Button
          variant="ghost"
          disabled={!hasOverride || locked}
          onClick={regenerate}
        >
          <RotateCcw className="size-4" />
          Regenerate
        </Button>
        <Button
          variant={locked ? 'secondary' : 'outline'}
          onClick={toggleFinalised}
        >
          {locked ? 'Reopen draft' : 'Finalise'}
        </Button>
        {locked ? (
          <Button
            variant={current.status === 'completed' ? 'default' : 'outline'}
            onClick={toggleCompleted}
          >
            <Check className="size-4" />
            Completed
          </Button>
        ) : null}
        {editing ? (
          <EditorToolbar format={formatState} onFormat={applyFormat} onFontSize={applyFontSize} />
        ) : null}
      </div>
      <div className="relative">
        <div
          ref={docRef}
          contentEditable={editing}
          suppressContentEditableWarning
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          className={cn(editing && 'rounded-2xl outline outline-2 outline-offset-2 outline-accent/40')}
        >
          {current.docOverride ? (
            <div dangerouslySetInnerHTML={{ __html: current.docOverride }} />
          ) : isCag ? (
            <CagReportLayout procedure={current} />
          ) : (
            <PtcaReportLayout procedure={current} />
          )}
        </div>
      </div>
      <div className="no-print grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Button variant="secondary" onClick={() => void copy()}>
          <Copy className="size-4" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="secondary" onClick={() => void share()}>
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / PDF
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadBlob(`${stem}.txt`, note, 'text/plain')}
        >
          <Download className="size-4" />
          .txt
        </Button>
        <Button variant="secondary" disabled={exportingDocx} onClick={() => void exportDocx()}>
          <Download className="size-4" />
          {exportingDocx ? 'Exporting…' : '.docx'}
        </Button>
        <Button
          className="col-span-2 lg:col-span-5"
          variant="outline"
          onClick={() =>
            downloadBlob(`${stem}.json`, JSON.stringify(current, null, 2), 'application/json')
          }
        >
          <Download className="size-4" />
          Download structured JSON
        </Button>
      </div>
    </div>
  )
}
