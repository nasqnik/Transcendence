import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Standard dialog focus behavior: on open, focuses the first focusable
 * element inside `dialogRef` (or the dialog itself as a fallback); traps
 * Tab/Shift+Tab so focus cycles within the dialog instead of escaping to the
 * page behind it; closes on Escape; and restores focus to whatever was
 * focused before the dialog opened once it unmounts.
 */
export function useFocusTrap(dialogRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    // Respect an element that already grabbed focus on mount (e.g. an input
    // with `autoFocus`) instead of always jumping to the first focusable item.
    if (dialog && !dialog.contains(document.activeElement)) {
      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(focusable[0] ?? dialog).focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return

      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(el => !el.hasAttribute('disabled'))
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [dialogRef, onClose])
}
