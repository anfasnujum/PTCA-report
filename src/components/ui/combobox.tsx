import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type ComboboxOption = { value: string; label: string }

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly ComboboxOption[]
  placeholder?: string
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [menu, setMenu] = useState({ top: 0, left: 0, width: 0 })

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return [...options]
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, value])

  const updateMenu = () => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const maxH = Math.min(240, filtered.length * 40 + 8)
    const openUp = spaceBelow < maxH + 8 && r.top > spaceBelow
    setMenu({
      top: openUp ? r.top - maxH - 4 : r.bottom + 4,
      left: r.left,
      width: r.width,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenu()
  }, [open, filtered.length, value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      const menuEl = document.getElementById(listId)
      if (menuEl?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onReposition = () => updateMenu()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, listId])

  useEffect(() => {
    setActive(0)
  }, [value, open])

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        className="pr-11"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
            return
          }
          if (!filtered.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => (i + 1) % filtered.length)
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => (i - 1 + filtered.length) % filtered.length)
            return
          }
          if (e.key === 'Enter' && open) {
            e.preventDefault()
            pick(filtered[active]?.value ?? value)
          }
        }}
      />
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
      {open && filtered.length
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              className="fixed z-[80] max-h-60 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-card"
              style={{ top: menu.top, left: menu.left, width: menu.width }}
            >
              {filtered.map((o, i) => (
                <li key={o.value} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    className={cn(
                      'flex min-h-10 w-full items-center px-4 text-left text-sm',
                      i === active ? 'bg-accent/15 text-foreground' : 'hover:bg-accent/10',
                    )}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o.value)}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}
