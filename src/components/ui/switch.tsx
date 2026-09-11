import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-card px-4"
    >
      <span className="text-base font-medium">{label}</span>
      <span
        className={cn(
          'relative h-8 w-14 rounded-full transition',
          checked ? 'bg-accent' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-6 rounded-full bg-foreground transition',
            checked ? 'right-1 bg-accent-fg' : 'left-1',
          )}
        />
      </span>
    </button>
  )
}
