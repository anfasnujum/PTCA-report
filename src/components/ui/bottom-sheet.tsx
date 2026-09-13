import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
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
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#10172a]/35"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl border border-border bg-surface shadow-card lg:inset-auto lg:left-1/2 lg:top-[7%] lg:w-[min(640px,calc(100vw-4rem))] lg:max-h-[86dvh] lg:-translate-x-1/2 lg:rounded-3xl">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border lg:hidden" />
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sheet">
            <X className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer ? <div className="border-t border-border p-4 pb-safe">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
