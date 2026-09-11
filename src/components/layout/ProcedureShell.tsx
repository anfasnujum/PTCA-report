import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useProcedureStore } from '@/store/useProcedureStore'
import { SavedIndicator } from '@/components/ui/saved-indicator'
import { DISCLAIMER } from '@/lib/format'
import { cn } from '@/lib/utils'

const STEPS = [
  { to: 'patient', label: 'Patient' },
  { to: 'access', label: 'Access' },
  { to: 'angiogram', label: 'Angio' },
  { to: 'timeline', label: 'PCI' },
  { to: 'result', label: 'Result' },
  { to: 'preview', label: 'Note' },
] as const

export function ProcedureShell() {
  const { id } = useParams()
  const navigate = useNavigate()
  const load = useProcedureStore((s) => s.load)
  const current = useProcedureStore((s) => s.current)
  const saveState = useProcedureStore((s) => s.saveState)
  const loadError = useProcedureStore((s) => s.loadError)

  useEffect(() => {
    if (id) void load(id)
  }, [id, load])

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-danger">{loadError}</p>
        <button type="button" className="mt-4 text-accent" onClick={() => navigate('/')}>
          Back home
        </button>
      </div>
    )
  }

  if (!current || current.id !== id) {
    return <div className="p-6 text-muted">Loading…</div>
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-border bg-background/95 pt-safe backdrop-blur">
        <div className="flex items-center gap-2 px-2 py-2">
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-2xl"
            onClick={() => navigate('/')}
            aria-label="Home"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {current.patient.name || 'New procedure'}
            </p>
            <SavedIndicator state={saveState} />
          </div>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold uppercase',
              current.status === 'finalised' ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn',
            )}
          >
            {current.status}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
          {STEPS.map((s) => (
            <NavLink
              key={s.to}
              to={`/procedure/${id}/${s.to}`}
              className={({ isActive }) =>
                cn(
                  'min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold leading-[44px]',
                  isActive ? 'bg-accent text-accent-fg' : 'bg-card text-muted',
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
      <footer className="no-print px-4 pb-safe text-center text-[11px] leading-snug text-muted">
        {DISCLAIMER}
      </footer>
    </div>
  )
}
