import { useEffect, type RefObject } from 'react'

/**
 * Dismisses a panel when the user clicks outside `ref` or presses Escape.
 * - `enabled`: suspend both handlers while a child dialog is open.
 * - `handleEscape`: set to false when a parent focus trap already owns Escape.
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  {
    enabled = true,
    handleEscape = true,
  }: { enabled?: boolean; handleEscape?: boolean } = {},
) {
  useEffect(() => {
    if (!enabled) return

    function onMouseDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }

    document.addEventListener('mousedown', onMouseDown)
    if (handleEscape) document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      if (handleEscape) document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, onDismiss, enabled, handleEscape])
}
