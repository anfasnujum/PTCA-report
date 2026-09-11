import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent',
        className,
      )}
      {...props}
    />
  )
}
