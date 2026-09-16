import { useEffect } from 'react'

function shouldIgnoreEnter(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing || e.repeat) return true
  if (e.metaKey || e.ctrlKey || e.altKey) return true
  const target = e.target
  if (!(target instanceof HTMLElement)) return true
  if (target.tagName === 'TEXTAREA' || target.isContentEditable) return true
  if (target.closest('[data-enter-next]')) return true
  if (document.querySelector('[data-sheet]')) return true
  return false
}

/** Presses the page Next button when Enter is pressed. */
export function useEnterNextButton() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreEnter(e)) return
      const next = document.querySelector<HTMLButtonElement>('[data-enter-next]')
      if (!next || next.disabled) return
      e.preventDefault()
      next.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
