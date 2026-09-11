import { cn } from '@/lib/utils'

const ACTIONS = [
  { kind: 'guideCatheter', label: '+ Guide' },
  { kind: 'guidewire', label: '+ Wire' },
  { kind: 'predilatation', label: '+ Balloon' },
  { kind: 'stent', label: '+ Stent' },
  { kind: 'postdilatation', label: '+ Post-dil' },
  { kind: 'imaging', label: '+ Imaging' },
  { kind: 'adjunct', label: '+ Other' },
] as const

export function ActionBar({ onAdd }: { onAdd: (kind: (typeof ACTIONS)[number]['kind'] | 'note') => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:static lg:z-auto lg:mt-4 lg:rounded-2xl lg:border lg:backdrop-blur-none">
      <div className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-3 pt-2 pb-safe scrollbar-none lg:max-w-none lg:flex-wrap lg:pb-3">
        {ACTIONS.map((a) => (
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
        <button
          type="button"
          onClick={() => onAdd('note')}
          className="min-h-12 shrink-0 rounded-full border border-border bg-card px-4 text-sm font-semibold"
        >
          + Note
        </button>
      </div>
    </div>
  )
}
