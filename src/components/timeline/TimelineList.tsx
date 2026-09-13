import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { EventCard } from '@/components/timeline/EventCard'
import type { ProcedureEvent } from '@/types/procedure'

export function TimelineList({
  events,
  onReorder,
  onEdit,
  onDelete,
  onRepeat,
  onDuplicate,
}: {
  events: ProcedureEvent[]
  onReorder: (ids: string[]) => void
  onEdit: (e: ProcedureEvent) => void
  onDelete: (id: string) => void
  onRepeat: (e: ProcedureEvent) => void
  onDuplicate: (e: ProcedureEvent) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = events.map((e) => e.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-muted shadow-card">
        Tap an action below to log the first step. Guide → wire → balloon → stent is the usual order.
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {events.map((e, i) => (
            <li key={e.id}>
              <p className="mb-1 pl-3 text-[11px] font-semibold uppercase tracking-widest text-muted">
                {String(i + 1).padStart(2, '0')}
              </p>
              <EventCard
                event={e}
                onEdit={() => onEdit(e)}
                onDelete={() => onDelete(e.id)}
                onRepeat={
                  e.kind === 'predilatation' || e.kind === 'postdilatation'
                    ? () => onRepeat(e)
                    : undefined
                }
                onDuplicate={() => onDuplicate(e)}
              />
            </li>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
