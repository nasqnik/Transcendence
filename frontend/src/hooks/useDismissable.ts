import { useEffect, type RefObject } from 'react'

/**
 * Dismisses a panel when the user clicks outside `ref` or presses Escape.
 * - `enabled`: suspend both handlers while a child dialog is open.
 * - `handleEscape`: set to false when a parent focus trap already owns Escape.
 * - `trapFocus`: keep Tab inside `ref` while open. Without it, tabbing past the
 *   last item in a popover walks into the page behind it while the popover is
 *   still on screen — the panel and the focus ring end up in different places.
 *   `ref` wraps the trigger too, so the cycle is trigger → items → trigger.
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  {
    enabled = true,
    handleEscape = true,
    trapFocus = false,
  }: { enabled?: boolean; handleEscape?: boolean; trapFocus?: boolean } = {},
) {
  useEffect(() => {
    if (!enabled) return

    function onMouseDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onDismiss(); return }
      if (!trapFocus || e.key !== 'Tab' || !ref.current) return
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    const needsKeys = handleEscape || trapFocus
    document.addEventListener('mousedown', onMouseDown)
    if (needsKeys) document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      if (needsKeys) document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, onDismiss, enabled, handleEscape, trapFocus])
}
