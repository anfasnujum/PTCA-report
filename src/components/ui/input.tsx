import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-11 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/25',
          className,
        )}
        {...props}
      />
    )
  },
)
