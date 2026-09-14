import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CagReportLayout } from '@/components/preview/CagReportLayout'
import { PtcaReportLayout } from '@/components/preview/PtcaReportLayout'
import { generateNote } from '@/lib/noteTemplate'
import { buildCagReportDocx, buildPtcaReportDocx, buildReportDocx } from '@/lib/reportDocx'
import { useProcedureStore } from '@/store/useProcedureStore'
import { cn } from '@/lib/utils'
import { Bold, Copy, Download, Italic, Printer, RotateCcw, Share2, Underline } from 'lucide-react'

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

function applyFormat(command: 'bold' | 'italic' | 'underline') {
  document.execCommand(command)
}

const FONT_SIZES = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Medium', value: '4' },
  { label: 'Large', value: '5' },
  { label: 'X-Large', value: '6' },
  { label: 'XX-Large', value: '7' },
]

function EditorToolbar({ onFontSize }: { onFontSize: (value: string) => void }) {
  return (
    <div className="no-print absolute left-4 top-4 z-10 flex w-fit items-center gap-1 rounded-xl bg-card p-1 shadow-card">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Bold"
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormat('bold')
        }}
      >
        <Bold className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Italic"
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormat('italic')
        }}
      >
        <Italic className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Underline"
        onMouseDown={(e) => {
          e.preventDefault()
          applyFormat('underline')
        }}
      >
        <Underline className="size-4" />
      </Button>
      <select
        className="min-h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-accent/40"
        title="Font size"
        defaultValue=""
        onChange={(e) => {
          if (!e.target.value) return
          onFontSize(e.target.value)
          e.target.value = ''
        }}
      >
        <option value="" disabled>
          Size
        </option>
        {FONT_SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
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
  const docRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

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
    setExportingDocx(true)
    try {
      const blob = current.docOverride?.trim()
        ? await buildReportDocx(current, note)
        : isCag
          ? await buildCagReportDocx(current)
          : await buildPtcaReportDocx(current)
      downloadBlobFile(`${stem}.docx`, blob)
    } finally {
      setExportingDocx(false)
    }
  }

  const commitEdit = () => {
    if (editing && docRef.current) {
      const html = docRef.current.innerHTML
      mutate((p) => ({ ...p, docOverride: html }))
    }
  }

  const toggleEditing = () => {
    commitEdit()
    setEditing((e) => !e)
  }

  const regenerate = () => {
    mutate((p) => ({ ...p, docOverride: undefined }))
    setEditing(false)
  }

  const toggleFinalised = () => {
    commitEdit()
    setEditing(false)
    setStatus(current.status === 'finalised' ? 'draft' : 'finalised')
  }

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.anchorNode && docRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const applyFontSize = (value: string) => {
    const sel = window.getSelection()
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
    document.execCommand('fontSize', false, value)
    docRef.current?.focus()
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          disabled={current.status === 'finalised'}
          onClick={toggleEditing}
        >
          {editing ? 'Done' : 'Edit in place'}
        </Button>
        <Button
          variant="ghost"
          disabled={!hasOverride || current.status === 'finalised'}
          onClick={regenerate}
        >
          <RotateCcw className="size-4" />
          Regenerate
        </Button>
        <Button
          variant={current.status === 'finalised' ? 'secondary' : 'outline'}
          onClick={toggleFinalised}
        >
          {current.status === 'finalised' ? 'Reopen draft' : 'Finalise'}
        </Button>
      </div>
      <div className="relative">
        {editing ? <EditorToolbar onFontSize={applyFontSize} /> : null}
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
