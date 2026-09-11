import { cn } from '@/lib/utils'
import type { SaveState } from '@/store/useProcedureStore'
import { Check, Loader2 } from 'lucide-react'

export function SavedIndicator({ state }: { state: SaveState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        state === 'saved' ? 'text-ok' : 'text-muted',
      )}
    >
      {state === 'saving' ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      {state === 'saving' ? 'Saving' : 'Saved'}
    </span>
  )
}
