import { useEffect, useRef } from 'react'

/**
 * Move focus into a control that has just replaced the one the user activated.
 *
 * Inline swaps — Remove → Confirm/Cancel, Edit → a form, Delete → are you sure —
 * unmount the button that was focused and mount different controls in its
 * place. Focus has nowhere to go, so it falls to `<body>` and a keyboard user
 * is silently returned to the top of the page mid-task.
 *
 * Pass `active` for the swapped-in state; the first focusable element inside
 * `ref` is focused when it becomes true. Focus is *not* stolen on the initial
 * render, only on the transition, so a page full of collapsed rows does not
 * fight over it.
 */
export function useFocusOnSwap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const wasActive = useRef(active)

  useEffect(() => {
    if (active && !wasActive.current) {
      const first = ref.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      first?.focus()
    }
    wasActive.current = active
  }, [active, ref])
}
