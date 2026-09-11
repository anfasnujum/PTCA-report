import { useMemo, useState } from 'react'
import { Plus, Search, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProcedureStore } from '@/store/useProcedureStore'
import { fmtDisplayDate } from '@/lib/format'
import type { Procedure } from '@/types/procedure'
import { cn } from '@/lib/utils'

export function HomePage() {
  const navigate = useNavigate()
  const create = useProcedureStore((s) => s.create)
  const [rows, setRows] = useState<Procedure[]>([])
  const [q, setQ] = useState('')

  const refresh = () => {
    void db.procedures.orderBy('updatedAt').reverse().toArray().then(setRows)
  }

  useEffect(() => {
    refresh()
  }, [])

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

  const openNew = () => {
    void create().then((id) => navigate(`/procedure/${id}/patient`))
  }

  const openRow = (p: Procedure) =>
    navigate(`/procedure/${p.id}/${p.events.length ? 'timeline' : 'patient'}`)

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface/80 pt-safe">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-accent">
            <Stethoscope className="size-6 shrink-0" />
            <div>
              <p className="text-sm font-semibold tracking-widest uppercase">CathNote</p>
              <p className="hidden text-xs text-muted sm:block">PTCA procedure notes — desktop workspace</p>
            </div>
          </div>
          <Button onClick={openNew} className="hidden sm:inline-flex">
            <Plus className="size-5" />
            New procedure
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Procedures</h1>
            <p className="mt-1 text-sm text-muted">Timeline builder for PTCA notes. Fully offline.</p>
          </div>
          <div className="flex gap-2">
            <Stat label="Drafts" value={drafts} />
            <Stat label="Finalised" value={finalised} />
          </div>
        </div>

        <div className="relative mb-4 max-w-lg">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-11"
            placeholder="Search name or hospital no."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Button size="lg" className="mb-5 w-full sm:hidden" onClick={openNew}>
          <Plus className="size-5" />
          New procedure
        </Button>

        <ul className="space-y-2 lg:hidden">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openRow(p)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
              >
                <RowBody p={p} />
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Hospital no.</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Indication</th>
                <th className="px-4 py-3 font-semibold">Operators</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-t border-border bg-background hover:bg-card"
                  onClick={() => openRow(p)}
                >
                  <td className="px-4 py-3 font-semibold">{p.patient.name || 'Unnamed patient'}</td>
                  <td className="px-4 py-3 text-muted">{p.patient.hospitalId || '—'}</td>
                  <td className="px-4 py-3 text-muted">{fmtDisplayDate(p.patient.date)}</td>
                  <td className="px-4 py-3 text-muted">{p.indication.chips.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-muted">{p.operators.join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted">No procedures yet.</p>
          ) : null}
        </div>
      </div>
      <p className="px-4 py-6 text-center text-[11px] text-muted">
        Not a medical device — documentation aid only. Verify all entries before signing.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: Procedure['status'] }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
        status === 'finalised' ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn',
      )}
    >
      {status}
    </span>
  )
}

function RowBody({ p }: { p: Procedure }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.patient.name || 'Unnamed patient'}</p>
        <p className="text-sm text-muted">
          {fmtDisplayDate(p.patient.date)}
          {p.indication.chips[0] ? ` · ${p.indication.chips[0]}` : ''}
          {p.patient.hospitalId ? ` · ${p.patient.hospitalId}` : ''}
        </p>
      </div>
      <StatusBadge status={p.status} />
    </>
  )
}
