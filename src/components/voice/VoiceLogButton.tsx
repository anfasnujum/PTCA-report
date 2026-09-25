import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ScrollText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatVoiceAction } from '@/lib/voice/logFormat'
import { useVoiceLogStore } from '@/store/useVoiceLogStore'
import { cn } from '@/lib/utils'

function timeLabel(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function VoiceLogButton({ procedureId }: { procedureId: string }) {
  const [open, setOpen] = useState(false)
  const allEntries = useVoiceLogStore((s) => s.entries)
  const clearProcedure = useVoiceLogStore((s) => s.clearProcedure)
  const entries = allEntries.filter((entry) => entry.procedureId === procedureId)

  return (
    <>
      <button
        type="button"
        className="relative flex size-11 items-center justify-center rounded-2xl text-foreground hover:bg-background"
        onClick={() => setOpen(true)}
        aria-label="Voice log"
        title="Voice log"
      >
        <ScrollText className="size-5" />
        {entries.length ? (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-fg">
            {entries.length > 9 ? '9+' : entries.length}
          </span>
        ) : null}
      </button>
      {open
        ? createPortal(
            <div className="no-print fixed inset-0 z-[85]">
              <button type="button" aria-label="Close" className="absolute inset-0 bg-[#10172a]/35" onClick={() => setOpen(false)} />
              <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-card">
                <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h2 className="text-base font-semibold">Voice log</h2>
                    <p className="text-xs text-muted">Transcript and edits for this case</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {entries.length ? (
                      <Button variant="ghost" size="sm" onClick={() => clearProcedure(procedureId)}>
                        Clear
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close voice log">
                      <X className="size-5" />
                    </Button>
                  </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {!entries.length ? (
                    <p className="text-sm leading-relaxed text-muted">
                      Speak with the mic and this panel will list the transcript and every report change.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {entries.map((entry) => (
                        <li
                          key={entry.id}
                          className={cn(
                            'rounded-2xl border border-border bg-card p-3',
                            entry.undone && 'opacity-60',
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                              {timeLabel(entry.at)}
                              {entry.undone ? ' · undone' : ''}
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                entry.status === 'apply'
                                  ? 'bg-accent-soft text-accent'
                                  : entry.status === 'error'
                                    ? 'bg-background text-danger'
                                    : 'bg-background text-muted',
                              )}
                            >
                              {entry.status}
                            </span>
                          </div>
                          {entry.transcript ? (
                            <p className="text-sm leading-relaxed">“{entry.transcript}”</p>
                          ) : null}
                          {entry.error ? <p className="mt-2 text-sm text-danger">{entry.error}</p> : null}
                          {entry.summary && entry.status !== 'error' ? (
                            <p className="mt-2 text-sm text-muted">{entry.summary}</p>
                          ) : null}
                          {entry.actions.length ? (
                            <ul className="mt-2 space-y-1">
                              {entry.actions.map((action, i) => (
                                <li key={`${entry.id}-${i}`} className="text-sm font-medium">
                                  {formatVoiceAction(action)}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {entry.options?.length ? (
                            <ul className="mt-2 space-y-1 text-sm text-muted">
                              {entry.options.map((option) => (
                                <li key={option.label}>Option: {option.label}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
