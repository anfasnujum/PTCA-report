import { cn } from '@/lib/utils'

export function BrandIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
        <path
          d="M7.2 17.2 12 5.5l4.8 11.7"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8.6 13.6h6.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function BrandMark({
  subtitle = 'Procedure console',
  compact = false,
}: {
  subtitle?: string
  compact?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandIcon />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
          CathNote
        </p>
        {compact ? null : (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
