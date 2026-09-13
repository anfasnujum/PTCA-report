import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/25',
        className,
      )}
      {...props}
    />
  )
}
