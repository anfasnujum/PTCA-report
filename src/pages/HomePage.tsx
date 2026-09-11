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

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-safe">
      <header className="pb-4 pt-6">
        <div className="mb-1 flex items-center gap-2 text-accent">
          <Stethoscope className="size-6" />
          <span className="text-sm font-semibold tracking-widest uppercase">CathNote</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Procedures</h1>
        <p className="mt-1 text-sm text-muted">Timeline builder for PTCA notes. Fully offline.</p>
      </header>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-11"
          placeholder="Search name or hospital no."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Button
        size="lg"
        className="mb-5 w-full"
        onClick={() => {
          void create().then((id) => navigate(`/procedure/${id}/patient`))
        }}
      >
        <Plus className="size-5" />
        New procedure
      </Button>
      <ul className="space-y-2 pb-safe">
        {filtered.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/procedure/${p.id}/${p.events.length ? 'timeline' : 'patient'}`,
                )
              }
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.patient.name || 'Unnamed patient'}</p>
                <p className="text-sm text-muted">
                  {fmtDisplayDate(p.patient.date)}
                  {p.indication.chips[0] ? ` · ${p.indication.chips[0]}` : ''}
                  {p.patient.hospitalId ? ` · ${p.patient.hospitalId}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase',
                  p.status === 'finalised' ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn',
                )}
              >
                {p.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-auto py-6 text-center text-[11px] text-muted">
        Not a medical device — documentation aid only. Verify all entries before signing.
      </p>
    </div>
  )
}
