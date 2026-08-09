import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postCompletion, type CompletionInfo } from '../api/tasks'
import { PENDING_REWARDS_KEY } from './useRewards'
import { type Task } from '../constants/categories'

/** How long a ticked task stays on screen before it drops out of the list. */
const LINGER_MS = 1000

const TICKED: CompletionInfo = { status: 'confirmed', review_note: '' }
/** The linger state for a task the server put in front of a parent. */
const SUBMITTED: CompletionInfo = { status: 'pending', review_note: '' }

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
  // What to show during the linger window, per task. State, not a ref: a ref
  // write does not re-render, so correcting a row from ticked to waiting only
  // took effect if something else happened to re-render first — which for a
  // pending task it no longer does, since that path deliberately fires no XP
  // toast. The row stayed green for the whole window.
  const [lingerAs, setLingerAs] = useState<ReadonlyMap<string, CompletionInfo>>(new Map())

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
    // Cleared with the timer so a retried task never inherits the previous
    // attempt's display state.
    setLingerAs(prev => {
      if (!prev.has(taskId)) return prev
      const next = new Map(prev)
      next.delete(taskId)
      return next
    })
    setLingering(prev => {
      if (!prev.has(taskId)) return prev
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  const { mutate } = useMutation({
    mutationFn: postCompletion,
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationStats'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] })
      // task-service returns the award inline, but that response does not mark
      // it seen — so it is also waiting in the pending feed. Refetching that is
      // what triggers the celebration, keeping one source of truth rather than
      // two paths that would have to agree on what was already shown.
      queryClient.invalidateQueries({ queryKey: PENDING_REWARDS_KEY })
      // The server decides whether this counted or now needs a parent. A task
      // with review_mode 'always' comes back `pending`, and celebrating it with
      // a green tick and "+N XP" promises points that have not been awarded —
      // then contradicts itself a second later when the row turns into a ⏳.
      // Correct the optimistic guess against what the server actually did.
      const confirmed = data?.status === 'confirmed'
      setLingerAs(prev => new Map(prev).set(taskId, confirmed ? TICKED : SUBMITTED))
      const xp = confirmed ? (tasks.find(t => t.id === taskId)?.xp_reward ?? 0) : 0
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
    // Seeded from the task's own review_mode rather than assuming a tick. A
    // task that always needs a parent is never confirmed by tapping it, so
    // flashing green and then correcting to ⏳ tells the kid something untrue
    // for a beat. 'optional' is unknown until the server answers, so it starts
    // optimistic and is corrected in onSuccess.
    const needsReview = tasks.find(t => t.id === taskId)?.review_mode === 'always'
    setLingerAs(prev => new Map(prev).set(taskId, needsReview ? SUBMITTED : TICKED))
    setLingering(prev => new Set(prev).add(taskId))
    mutate(taskId)
  }, [mutate, tasks])

  /**
   * What a row should render as. A lingering task shows its tick straight away
   * rather than waiting for the server round-trip.
   */
  const displayCompletion = useCallback(
    (taskId: string, actual: CompletionInfo | undefined): CompletionInfo | undefined =>
      lingering.has(taskId) ? (lingerAs.get(taskId) ?? TICKED) : actual,
    [lingering, lingerAs],
  )

  return { complete, lingering, displayCompletion, toastXp, toastError, showError }
}
