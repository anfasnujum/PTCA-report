import { cn } from '@/lib/utils'

const ACTIONS = [
  { kind: 'guideCatheter', label: '+ Catheter' },
  { kind: 'thrombusAspiration', label: '+ Aspiration' },
  { kind: 'microcatheter', label: '+ Microcath' },
  { kind: 'guidewire', label: '+ Wire' },
  { kind: 'guideExtension', label: '+ Extension' },
  { kind: 'predilatation', label: '+ Balloon' },
  { kind: 'stent', label: '+ Stent' },
  { kind: 'postdilatation', label: '+ Post-dil' },
  { kind: 'imaging', label: '+ Imaging' },
  { kind: 'adjunct', label: '+ Other' },
] as const

export function ActionBar({
  onAdd,
  variant = 'dock',
  kinds,
  showNote = true,
}: {
  onAdd: (kind: (typeof ACTIONS)[number]['kind'] | 'note') => void
  variant?: 'dock' | 'inline'
  kinds?: Array<(typeof ACTIONS)[number]['kind']>
  showNote?: boolean
}) {
  const actions = kinds ? ACTIONS.filter((a) => kinds.includes(a.kind)) : ACTIONS
  return (
    <div
      className={
        variant === 'inline'
          ? 'rounded-2xl border border-border bg-card'
          : 'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:static lg:z-auto lg:mt-4 lg:rounded-2xl lg:border-0 lg:bg-card lg:shadow-card lg:backdrop-blur-none'
      }
    >
      <div
        className={
          variant === 'inline'
            ? 'flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none'
            : 'mx-auto flex max-w-lg gap-2 overflow-x-auto px-3 pt-2 pb-safe scrollbar-none lg:max-w-none lg:flex-wrap lg:pb-3'
        }
      >
        {actions.map((a) => (
          <button
            key={a.kind}
            type="button"
            onClick={() => onAdd(a.kind)}
            className={cn(
              'min-h-12 shrink-0 rounded-full px-4 text-sm font-semibold',
              a.kind === 'stent' || a.kind === 'predilatation'
                ? 'bg-accent text-accent-fg'
                : 'bg-card text-foreground border border-border',
            )}
          >
            {a.label}
          </button>
        ))}
        {showNote ? (
        <button
          type="button"
          onClick={() => onAdd('note')}
          className="min-h-12 shrink-0 rounded-full border border-border bg-card px-4 text-sm font-semibold"
        >
          + Note
        </button>
        ) : null}
      </div>
    </div>
  )
}
