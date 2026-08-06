import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postCompletion, type CompletionInfo } from '../api/tasks'
import { PENDING_REWARDS_KEY } from './useRewards'
import { type Task } from '../constants/categories'

/** How long a ticked task stays on screen before it drops out of the list. */
const LINGER_MS = 1000

const TICKED: CompletionInfo = { status: 'confirmed', review_note: '' }

/**
 * Marking a task done, with the XP and error toasts that go with it, plus the
 * brief pause where the row shows its tick before leaving the list. Shared by
 * the dashboard and the tasks page so both behave identically.
 *
 * `showError` is exposed so callers can surface the same toast for their own
 * failures (e.g. deleting tasks).
 */
export function useTaskCompletion(tasks: Task[]) {
  const queryClient = useQueryClient()
  const [toastXp, setToastXp] = useState<number | null>(null)
  const [toastError, setToastError] = useState(false)
  const [lingering, setLingering] = useState<ReadonlySet<string>>(new Set())
  const xpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lingerTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const timers = lingerTimers.current
    return () => {
      if (xpTimer.current) clearTimeout(xpTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  const showError = useCallback(() => {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    setToastError(true)
    errorTimer.current = setTimeout(() => setToastError(false), 3000)
  }, [])

  const stopLingering = useCallback((taskId: string) => {
    const timer = lingerTimers.current.get(taskId)
    if (timer) clearTimeout(timer)
    lingerTimers.current.delete(taskId)
    setLingering(prev => {
      if (!prev.has(taskId)) return prev
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  const { mutate } = useMutation({
    mutationFn: postCompletion,
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationStats'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] })
      // task-service returns the award inline, but that response does not mark
      // it seen — so it is also waiting in the pending feed. Refetching that is
      // what triggers the celebration, keeping one source of truth rather than
      // two paths that would have to agree on what was already shown.
      queryClient.invalidateQueries({ queryKey: PENDING_REWARDS_KEY })
      const xp = tasks.find(t => t.id === taskId)?.xp_reward ?? 0
      if (xp > 0) {
        if (xpTimer.current) clearTimeout(xpTimer.current)
        setToastXp(xp)
        xpTimer.current = setTimeout(() => setToastXp(null), 2000)
      }
      // Timed from the server's reply, not the tap, so the refetch above has a
      // full second to land — otherwise a slow response lets the row reappear
      // un-ticked for a frame before it drops out.
      const existing = lingerTimers.current.get(taskId)
      if (existing) clearTimeout(existing)
      lingerTimers.current.set(taskId, setTimeout(() => stopLingering(taskId), LINGER_MS))
    },
    onError: (_err, taskId) => {
      // Put the row back so the task isn't silently lost.
      stopLingering(taskId)
      showError()
    },
  })

  /** Tick the row straight away; it drops out a moment after the save lands. */
  const complete = useCallback((taskId: string) => {
    setLingering(prev => new Set(prev).add(taskId))
    mutate(taskId)
  }, [mutate])

  /**
   * What a row should render as. A lingering task shows its tick straight away
   * rather than waiting for the server round-trip.
   */
  const displayCompletion = useCallback(
    (taskId: string, actual: CompletionInfo | undefined): CompletionInfo | undefined =>
      lingering.has(taskId) ? TICKED : actual,
    [lingering],
  )

  return { complete, lingering, displayCompletion, toastXp, toastError, showError }
}
