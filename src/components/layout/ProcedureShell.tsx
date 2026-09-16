import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useProcedureStore } from '@/store/useProcedureStore'
import { useSyncStore } from '@/store/useSyncStore'
import { SavedIndicator } from '@/components/ui/saved-indicator'
import { BrandMark } from '@/components/layout/BrandMark'
import { DISCLAIMER } from '@/lib/format'
import { cn } from '@/lib/utils'
import { stepsFor } from '@/components/layout/steps'
import { NotePanel } from '@/components/layout/NotePanel'
import { useEnterNextButton } from '@/hooks/useEnterNextButton'

export function ProcedureShell() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const load = useProcedureStore((s) => s.load)
  const current = useProcedureStore((s) => s.current)
  const saveState = useProcedureStore((s) => s.saveState)
  const loadError = useProcedureStore((s) => s.loadError)
  const lastPullAt = useSyncStore((s) => s.lastPullAt)
  const showNotePanel = !location.pathname.endsWith('/preview')
  useEnterNextButton()

  useEffect(() => {
    if (id) void load(id)
  }, [id, load])

  useEffect(() => {
    if (!id || !lastPullAt) return
    if (useProcedureStore.getState().saveState === 'saving') return
    void load(id)
  }, [id, lastPullAt, load])

  useEffect(() => {
    if (!current || current.id !== id) return
    if (current.kind === 'cag' && location.pathname.endsWith('/timeline')) {
      navigate(`/procedure/${id}/result`, { replace: true })
    }
  }, [current, id, location.pathname, navigate])

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

  const steps = stepsFor(current.kind)

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-5 text-left"
        >
          <BrandMark subtitle="Procedure console" />
        </button>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
          {steps.map((s, i) => (
            <NavLink
              key={s.to}
              to={`/procedure/${id}/${s.to}`}
              className={({ isActive }) =>
                cn(
                  'rounded-2xl px-3 py-3',
                  isActive
                    ? 'bg-accent-soft text-foreground'
                    : 'text-foreground hover:bg-background',
                )
              }
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs opacity-80">{s.hint}</p>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-border bg-surface/95 pt-safe backdrop-blur">
          <div className="flex items-center gap-2 px-2 py-2 lg:px-6">
            <button
              type="button"
              className="flex size-12 items-center justify-center rounded-2xl lg:hidden"
              onClick={() => navigate('/')}
              aria-label="Home"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold lg:text-base">
                {current.patient.name || (current.kind === 'cag' ? 'New CAG' : 'New PTCA')}
                {current.patient.hospitalId ? (
                  <span className="font-normal text-muted"> · {current.patient.hospitalId}</span>
                ) : null}
              </p>
              <SavedIndicator state={saveState} />
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                current.status === 'draft' ? 'bg-background text-warn' : 'bg-accent-soft text-accent',
              )}
            >
              {current.status}
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none lg:hidden">
            {steps.map((s) => (
              <NavLink
                key={s.to}
                to={`/procedure/${id}/${s.to}`}
                className={({ isActive }) =>
                  cn(
                    'min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold leading-[44px]',
                    isActive ? 'bg-accent text-accent-fg' : 'bg-card text-foreground shadow-card',
                  )
                }
              >
                {s.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6 print:p-0">
            <div
              className={cn(
                'mx-auto w-full max-w-lg print:mx-0 print:max-w-none',
                location.pathname.endsWith('/angiogram') ? 'lg:max-w-5xl' : 'lg:max-w-3xl',
              )}
            >
              <Outlet />
            </div>
            <footer className="no-print mx-auto max-w-lg px-1 pb-safe pt-8 text-center text-[11px] leading-snug text-muted xl:hidden">
              {DISCLAIMER}
            </footer>
          </main>
          {showNotePanel ? (
            <aside className="no-print hidden w-[400px] shrink-0 flex-col border-l border-border bg-surface xl:flex">
              <NotePanel />
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
