import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
  large,
  nested,
  bodyClassName,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  large?: boolean
  nested?: boolean
  bodyClassName?: string
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={nested ? 'fixed inset-0 z-[70]' : 'fixed inset-0 z-50'} data-sheet>
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#10172a]/35"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-card',
          wide
            ? 'max-h-[96dvh] md:inset-auto md:left-1/2 md:top-[1.5%] md:w-[min(1280px,calc(100vw-1.5rem))] md:max-h-[97dvh] md:-translate-x-1/2 md:rounded-3xl'
            : large
              ? 'max-h-[96dvh] sm:inset-auto sm:left-1/2 sm:top-[1%] sm:w-[min(1100px,calc(100vw-1rem))] sm:max-h-[98dvh] sm:-translate-x-1/2 sm:rounded-3xl'
              : 'max-h-[92dvh] lg:inset-auto lg:left-1/2 lg:top-[7%] lg:w-[min(640px,calc(100vw-4rem))] lg:max-h-[86dvh] lg:-translate-x-1/2 lg:rounded-3xl',
        )}
      >
        <div
          className={cn(
            'mx-auto mt-2 h-1.5 w-12 rounded-full bg-border',
            wide ? 'md:hidden' : large ? 'sm:hidden' : 'lg:hidden',
          )}
        />
        <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sheet">
            <X className="size-5" />
          </Button>
        </header>
        <div className={bodyClassName ?? 'min-h-0 flex-1 overflow-y-auto px-4 pb-4'}>{children}</div>
        {footer ? <div className="border-t border-border p-3 pb-safe">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
