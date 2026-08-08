import { useEffect, useState, useSyncExternalStore } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/**
 * Whether the viewer asked their system for less movement.
 *
 * `useSyncExternalStore` rather than reading `matchMedia` into state from an
 * effect: the preference is an external system React needs to subscribe to, and
 * writing it with `setState` in an effect body triggers a cascading render.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia?.(REDUCED_MOTION).matches ?? false,
    () => false,
  )
}

/**
 * Counts up to `target`, for a number worth noticing.
 *
 * Returns `target` outright when the viewer prefers reduced motion, or when
 * there is nothing to count to. The animated value is only ever written from
 * the animation frame callback, never synchronously from the effect.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const reduced = usePrefersReducedMotion()
  const [animated, setAnimated] = useState(0)
  const shouldAnimate = !reduced && target > 0

  useEffect(() => {
    if (!shouldAnimate) return

    let frame = 0
    const start = performance.now()

    function step(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      // Ease out: quick at first, settling onto the final number. The last
      // frame assigns `target` exactly, so it never lands on a rounding
      // artefact one short.
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimated(progress === 1 ? target : Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, shouldAnimate])

  return shouldAnimate ? animated : target
}
