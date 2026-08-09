import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TaskStreamError } from '../api/tasks'

export type TaskStreamStatus = 'idle' | 'streaming' | 'error'

/**
 * task-service's `AIError.code` → an i18n key.
 *
 * Every one of these used to surface as "Something went wrong", which told a
 * kid nothing — least of all that their task was rejected for what it said
 * rather than because the network failed. The message that arrives alongside
 * the code is written by the moderation model in English, so the code is what
 * gets translated, not the text.
 */
const AI_ERROR_KEYS: Record<string, string> = {
  content_blocked: 'errors.ai.contentBlocked',
  rate_limited: 'errors.ai.rateLimited',
  service_unavailable: 'errors.ai.serviceUnavailable',
  authentication_failed: 'errors.ai.serviceUnavailable',
  invalid_response: 'errors.ai.invalidResponse',
}

const AI_ERROR_FALLBACK = 'errors.ai.generic'

/** Shape of `createTaskStream` / `updateTaskStream` once their id/payload is bound. */
export type BoundTaskStream = (
  onText: (chunk: string) => void,
  onDone: () => void,
  signal: AbortSignal,
) => Promise<void>

/**
 * The streaming save shared by the create and edit task modals: run the
 * request, accumulate the text the AI sends back, refresh the task list and
 * close on completion.
 *
 * Both modals had their own copy of this — including the abort-on-unmount and
 * the check that swallows AbortError rather than flashing a failure at someone
 * who simply closed the dialog. Two copies of a cancellation rule is how one
 * of them ends up showing an error on close and the other doesn't.
 *
 * Delete is deliberately not here: only the edit modal has it, it does not
 * stream, and folding it in would mean a status union with a state that is
 * unreachable from one of the two callers. It reports failures through `fail`
 * rather than a raw `setStatus`, so 'streaming' stays this hook's to set.
 */
export function useTaskStream(onClose: () => void) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TaskStreamStatus>('idle')
  const [errorKey, setErrorKey] = useState(AI_ERROR_FALLBACK)
  const [streamingText, setStreamingText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Closing the dialog mid-stream must cancel the request, not leave it
  // writing into a component that is gone.
  useEffect(() => () => abortRef.current?.abort(), [])

  async function run(stream: BoundTaskStream) {
    // Cancel anything still in flight: a second submit used to orphan the
    // first controller, leaving a request nobody could abort.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('streaming')
    setStreamingText('')

    try {
      await stream(
        chunk => setStreamingText(prev => prev + chunk),
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          onClose()
        },
        controller.signal,
      )
    } catch (err: unknown) {
      // The user closed the dialog, or a newer submit superseded this one:
      // not a failure to report. Returning without resetting left the modal
      // stuck on the streaming view if it was still mounted.
      if ((err as Error)?.name === 'AbortError') {
        if (abortRef.current === controller) setStatus('idle')
        return
      }
      setErrorKey(
        err instanceof TaskStreamError
          ? AI_ERROR_KEYS[err.code] ?? AI_ERROR_FALLBACK
          : AI_ERROR_FALLBACK,
      )
      setStatus('error')
    }
  }

  /** Report a failure from work this hook did not run (the edit modal's delete). */
  function fail() {
    setErrorKey(AI_ERROR_FALLBACK)
    setStatus('error')
  }

  return { status, errorKey, streamingText, run, fail }
}
