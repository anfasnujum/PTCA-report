import {
  Copy,
  GripVertical,
  Pencil,
  Repeat2,
  Trash2,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState } from 'react'
import { eventTitle, summarizeEvent } from '@/lib/eventSummary'
import { cn } from '@/lib/utils'
import type { ProcedureEvent } from '@/types/procedure'

export function EventCard({
  event,
  onEdit,
  onDelete,
  onRepeat,
  onDuplicate,
}: {
  event: ProcedureEvent
  onEdit: () => void
  onDelete: () => void
  onRepeat?: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
  })
  const startX = useRef(0)
  const [dx, setDx] = useState(0)
  const balloon = event.kind === 'predilatation' || event.kind === 'postdilatation'

  return (
    <div className="relative">
      <div className="absolute inset-y-2 right-2 flex items-center rounded-xl bg-danger px-4 text-sm font-semibold text-background">
        Delete
      </div>
      <article
        ref={setNodeRef}
        style={{
          transform: [CSS.Transform.toString(transform), dx ? `translateX(${dx}px)` : null]
            .filter(Boolean)
            .join(' '),
          transition,
        }}
        className={cn(
          'relative flex items-stretch gap-1 rounded-2xl border border-border bg-card',
          isDragging && 'z-10 opacity-90',
        )}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX
        }}
        onTouchMove={(e) => {
          const delta = e.touches[0].clientX - startX.current
          if (delta < 0) setDx(Math.max(-96, delta))
        }}
        onTouchEnd={() => {
          if (dx < -72) onDelete()
          setDx(0)
        }}
      >
        <button
          type="button"
          className="flex w-12 shrink-0 touch-none items-center justify-center text-muted"
          aria-label="Reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 py-3 pr-2 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {eventTitle(event.kind)}
          </p>
          <p className="text-[15px] font-medium leading-snug">{summarizeEvent(event)}</p>
        </button>
        <div className="flex flex-col lg:flex-row">
          {balloon ? (
            <button
              type="button"
              className="flex size-12 items-center justify-center text-accent"
              aria-label="Repeat inflation"
              onClick={onRepeat}
            >
              <Repeat2 className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              className="flex size-12 items-center justify-center text-muted"
              aria-label="Duplicate"
              onClick={onDuplicate}
            >
              <Copy className="size-4" />
            </button>
          )}
          <button
            type="button"
            className="flex size-12 items-center justify-center text-muted"
            aria-label="Edit"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            className="flex size-12 items-center justify-center text-danger"
            aria-label="Delete"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </article>
    </div>
  )
}
