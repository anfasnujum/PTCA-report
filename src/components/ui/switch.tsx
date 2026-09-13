import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onChange,
  label,
  yesNo = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  yesNo?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 shadow-card"
    >
      <span className="text-base font-medium">{label}</span>
      <span className="flex items-center gap-2">
        {yesNo ? (
          <span className={cn('text-sm font-semibold', checked ? 'text-muted' : 'text-foreground')}>
            No
          </span>
        ) : null}
        <span
          className={cn(
            'relative h-8 w-14 rounded-full transition',
            checked ? 'bg-accent' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-1 size-6 rounded-full bg-white shadow-sm transition',
              checked ? 'right-1' : 'left-1',
            )}
          />
        </span>
        {yesNo ? (
          <span className={cn('text-sm font-semibold', checked ? 'text-foreground' : 'text-muted')}>
            Yes
          </span>
        ) : null}
      </span>
    </button>
  )
}
