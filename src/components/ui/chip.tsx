import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Chip({
  selected,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'min-h-12 shrink-0 rounded-full border px-4 text-base font-medium transition active:scale-[0.98]',
        selected
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border bg-card text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function ChipScroller({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  )
}

export function NumberChips({
  values,
  value,
  onChange,
  format,
  suffix = '',
}: {
  values: readonly number[]
  value: number
  onChange: (n: number) => void
  format?: (n: number) => string
  suffix?: string
}) {
  return (
    <ChipScroller>
      {values.map((v) => (
        <Chip key={v} selected={v === value} onClick={() => onChange(v)}>
          {(format ? format(v) : String(v)) + suffix}
        </Chip>
      ))}
    </ChipScroller>
  )
}
