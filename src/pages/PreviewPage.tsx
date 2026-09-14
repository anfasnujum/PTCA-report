import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CagReportLayout } from '@/components/preview/CagReportLayout'
import { generateNote } from '@/lib/noteTemplate'
import { buildCagReportDocx, buildReportDocx } from '@/lib/reportDocx'
import { useProcedureStore } from '@/store/useProcedureStore'
import { Copy, Download, Printer, RotateCcw, Share2 } from 'lucide-react'

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

export function PreviewPage() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const setStatus = useProcedureStore((s) => s.setStatus)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)

  const generated = useMemo(() => (current ? generateNote({ ...current, noteOverride: undefined }) : ''), [current])
  const note = current?.noteOverride?.trim() ? generateNote(current) : generated

  if (!current) return null

  const kindLabel = current.kind === 'cag' ? 'CAG' : 'PTCA'
  const stem = `${kindLabel}-${current.patient.hospitalId || current.patient.name || 'note'}-${current.patient.date}`

  const copy = async () => {
    await navigator.clipboard.writeText(note)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: current.kind === 'cag' ? 'CAG procedure note' : 'PTCA procedure note',
        text: note,
      })
      return
    }
    await copy()
  }

  const useCagLayout = current.kind === 'cag' && !current.noteOverride?.trim()

  const exportDocx = async () => {
    setExportingDocx(true)
    try {
      const blob = useCagLayout ? await buildCagReportDocx(current) : await buildReportDocx(current, note)
      downloadBlobFile(`${stem}.docx`, blob)
    } finally {
      setExportingDocx(false)
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done' : 'Edit in place'}
        </Button>
        {current.noteOverride ? (
          <Button
            variant="ghost"
            onClick={() => {
              mutate((p) => ({ ...p, noteOverride: undefined }))
              setEditing(false)
            }}
          >
            <RotateCcw className="size-4" />
            Regenerate
          </Button>
        ) : null}
        <Button
          variant={current.status === 'finalised' ? 'secondary' : 'outline'}
          onClick={() => setStatus(current.status === 'finalised' ? 'draft' : 'finalised')}
        >
          {current.status === 'finalised' ? 'Reopen draft' : 'Finalise'}
        </Button>
      </div>
      {editing ? (
        <Textarea
          className="min-h-[28rem] font-mono text-sm leading-relaxed"
          value={current.noteOverride ?? generated}
          onChange={(e) => mutate((p) => ({ ...p, noteOverride: e.target.value }))}
        />
      ) : useCagLayout ? (
        <CagReportLayout procedure={current} />
      ) : (
        <pre className="print-note overflow-x-auto whitespace-pre-wrap rounded-2xl bg-card p-4 font-mono text-[13px] leading-relaxed shadow-card lg:min-h-[28rem]">
          {note}
        </pre>
      )}
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
