import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent',
        className,
      )}
      {...props}
    />
  )
}
