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
  // Captured during the first render, which is the last moment the trigger is
  // still focused. Reading it inside the effect was too late: React applies an
  // input's `autoFocus` during the commit phase, before effects run, so by then
  // document.activeElement is already an element *inside* the dialog. Restoring
  // to that on close focused a node that was unmounting, and focus fell to
  // <body> — dumping a keyboard user at the top of the page.
  const previouslyFocused = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)
  )

  // Held in a ref so the setup effect below can depend only on the dialog.
  // Callers pass inline arrows (`onClose={() => setOpen(false)}`), so `onClose`
  // has a new identity on every render of the parent. With it in the dependency
  // array the effect tore down and re-ran on each of those renders, and the
  // re-run overwrote `previouslyFocused` with whatever was focused at the time
  // — by then an element *inside* the dialog. On close it restored focus to a
  // node that was unmounting, so focus silently fell back to <body> and a
  // keyboard user was dumped at the top of the page.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    // Copied out for the cleanup closure: the ref is set once at render and
    // never reassigned, but reading it in cleanup trips react-hooks lint.
    const trigger = previouslyFocused.current
    const dialog = dialogRef.current
    // Respect an element that already grabbed focus on mount (e.g. an input
    // with `autoFocus`) instead of always jumping to the first focusable item.
    if (dialog && !dialog.contains(document.activeElement)) {
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(el => !el.hasAttribute('disabled'))
      ;(focusable[0] ?? dialog).focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
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
      trigger?.focus()
    }
    // Deliberately only `dialogRef` (a stable ref object): this must run once
    // per dialog, on mount and unmount. See the note on onCloseRef above.
  }, [dialogRef])
}
