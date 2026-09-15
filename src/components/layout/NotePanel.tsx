import { useMemo, useState } from 'react'
import { Copy, Printer } from 'lucide-react'
import { generateNote } from '@/lib/noteTemplate'
import { DISCLAIMER } from '@/lib/format'
import { useProcedureStore } from '@/store/useProcedureStore'
import { Button } from '@/components/ui/button'

export function NotePanel() {
  const current = useProcedureStore((s) => s.current)
  const [copied, setCopied] = useState(false)

  const note = useMemo(() => (current ? generateNote(current) : ''), [current])

  if (!current) return null

  const copy = async () => {
    await navigator.clipboard.writeText(note)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">Live note</p>
          <p className="text-sm font-semibold">Updates as you log events</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => void copy()} aria-label="Copy note">
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label="Print note">
            <Printer className="size-4" />
          </Button>
        </div>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground/90">
        {note}
      </pre>
      {copied ? <p className="px-4 text-xs text-ok">Copied to clipboard</p> : null}
      <p className="border-t border-border px-4 py-3 text-[11px] leading-snug text-muted">{DISCLAIMER}</p>
    </div>
  )
}
