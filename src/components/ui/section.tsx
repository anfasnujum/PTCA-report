import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Section({
  title,
  unit,
  action,
  children,
  className,
}: {
  title: string
  unit?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold text-foreground">
          <span className="uppercase tracking-[0.18em]">{title}</span>
          {unit ? <span className="tracking-normal"> ({unit})</span> : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
