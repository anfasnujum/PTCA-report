import { useMemo, useState } from 'react'
import { Plus, Search, Settings, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandMark } from '@/components/layout/BrandMark'
import { CloudStatus } from '@/components/layout/CloudStatus'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useSyncStore } from '@/store/useSyncStore'
import { fmtDisplayDate } from '@/lib/format'
import { isCompletedProcedure, sortHomeProcedures } from '@/lib/homeList'
import type { Procedure, ProcedureKind } from '@/types/procedure'
import { cn } from '@/lib/utils'

export function HomePage() {
  const navigate = useNavigate()
  const create = useProcedureStore((s) => s.create)
  const remove = useProcedureStore((s) => s.remove)
  const lastPullAt = useSyncStore((s) => s.lastPullAt)
  const [rows, setRows] = useState<Procedure[]>([])
  const [q, setQ] = useState('')

  const refresh = () => {
    void db.procedures.toArray().then((list) => setRows(sortHomeProcedures(list)))
  }

  useEffect(() => {
    refresh()
  }, [lastPullAt])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((p) => {
      const hay = `${p.patient.name} ${p.patient.hospitalId} ${p.indication.chips.join(' ')}`.toLowerCase()
      return hay.includes(s)
    })
  }, [rows, q])

  const drafts = rows.filter((p) => p.status === 'draft').length
  const finalised = rows.filter((p) => p.status === 'finalised').length
  const completed = rows.filter((p) => isCompletedProcedure(p)).length

  const openNew = (kind: ProcedureKind) => {
    void create(kind).then((id) => navigate(`/procedure/${id}/patient`))
  }

  const openRow = (p: Procedure) => {
    const step =
      p.kind === 'cag'
        ? p.baselineAngio.length
          ? 'angiogram'
          : 'patient'
        : p.events.length
          ? 'timeline'
          : 'patient'
    navigate(`/procedure/${p.id}/${step}`)
  }

  const removeRow = (p: Procedure) => {
    const label = p.patient.name.trim() || 'this case'
    if (!window.confirm(`Remove ${label}? This cannot be undone.`)) return
    void remove(p.id).then(refresh)
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface pt-safe">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 lg:px-8">
          <div className="min-w-0 flex-1">
            <BrandMark subtitle="Procedure console" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CloudStatus />
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-2xl text-foreground hover:bg-background"
              onClick={() => navigate('/settings')}
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </button>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Button onClick={() => openNew('ptca')}>
              <Plus className="size-4" />
              New PTCA
            </Button>
            <Button variant="secondary" onClick={() => openNew('cag')}>
              <Plus className="size-4" />
              New CAG
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.65rem] font-semibold tracking-tight">Procedures</h1>
            <span className="rounded-full bg-surface px-3 py-1 text-sm text-muted shadow-card">
              {filtered.length} {filtered.length === 1 ? 'case' : 'cases'}
            </span>
          </div>
          <div className="flex gap-2">
            <Stat label="Drafts" value={drafts} />
            <Stat label="Finalised" value={finalised} />
            <Stat label="Completed" value={completed} />
          </div>
        </div>

        <div className="relative mb-5 max-w-lg">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-11"
            placeholder="Search name or cath no."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:hidden">
          <Button size="lg" onClick={() => openNew('ptca')}>
            <Plus className="size-5" />
            New PTCA
          </Button>
          <Button size="lg" variant="secondary" onClick={() => openNew('cag')}>
            <Plus className="size-5" />
            New CAG
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card px-6 py-16 text-center shadow-card">
            <p className="text-muted">No procedures yet.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <li key={p.id}>
                <div
                  className={cn(
                    'flex h-full w-full flex-col rounded-2xl bg-card p-5 shadow-card transition hover:-translate-y-0.5',
                    isCompletedProcedure(p) && 'opacity-80',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => openRow(p)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                        {initials(p.patient.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">
                          {p.patient.name || 'Unnamed patient'}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {p.patient.hospitalId || 'No cath no.'}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <StatusBadge status={p.status} />
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-background hover:text-danger"
                          aria-label={`Remove ${p.patient.name.trim() || 'case'}`}
                          onClick={() => removeRow(p)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
                        {p.kind === 'cag' ? 'CAG' : 'PTCA'}
                      </span>
                    </div>
                  </div>
                  <button type="button" onClick={() => openRow(p)} className="mt-5 text-left">
                    <div className="flex gap-3">
                      <MiniStat value={p.events.length} label="Events" />
                      <MiniStat
                        value={p.indication.chips[0] ? p.indication.chips[0].slice(0, 8) : '—'}
                        label="Indication"
                      />
                      <MiniStat value={fmtDisplayDate(p.patient.date)} label="Date" />
                    </div>
                    <p className="mt-4 truncate text-sm text-muted">
                      {p.operators.join(', ') || 'No operators listed'}
                    </p>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="px-4 py-6 text-center text-[11px] text-muted">
        Not a medical device — documentation aid only. Verify all entries before signing.
      </p>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'PT'
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-2xl bg-card px-4 py-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-h-12 items-center justify-center rounded-full bg-background px-2">
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-foreground">
        {label}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: Procedure['status'] }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
        status === 'draft' ? 'bg-background text-warn' : 'bg-accent-soft text-accent',
      )}
    >
      {status}
    </span>
  )
}
