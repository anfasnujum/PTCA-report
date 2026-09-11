import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function NoteEventSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: string
  onClose: () => void
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(initial)

  useEffect(() => {
    if (open) setText(initial)
  }, [open, initial])

  return (
    <BottomSheet
      open={open}
      title="Timeline note"
      onClose={onClose}
      footer={
        <Button size="lg" className="w-full" onClick={() => onSave(text)}>
          Save note
        </Button>
      }
    >
      <Textarea
        placeholder="Free-text event…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-40"
      />
    </BottomSheet>
  )
}
