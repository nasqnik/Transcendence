import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPendingRewards,
  markRewardsSeen,
  type RewardSummary,
} from '../api/gamification'
import useAuthStore from '../store/authStore'

export const PENDING_REWARDS_KEY = ['pendingRewards'] as const

/**
 * The queue of coin awards waiting to be celebrated.
 *
 * Everything comes from `/rewards/pending/`, including awards the kid just
 * earned: task-service returns the same object inline on a completion, but that
 * response does not mark it seen, so it lands in this feed too. Sourcing both
 * from one place avoids two paths that have to agree about what has already
 * been shown — the inline copy would otherwise need de-duplicating against the
 * feed by completion id.
 *
 * It also fixes a gap the old celebration had: level-ups were detected by
 * diffing category levels between refetches, which cannot fire on the first
 * load after opening the app. A parent confirming a task overnight produced
 * coins the kid was never told about. The server remembers instead.
 */
export function useRewards() {
  const token = useAuthStore(s => s.token)
  const queryClient = useQueryClient()

  const { data: pending = [] } = useQuery({
    queryKey: PENDING_REWARDS_KEY,
    queryFn: getPendingRewards,
    enabled: !!token,
  })

  const { mutate: acknowledge } = useMutation({
    mutationFn: (completionId: string) => markRewardsSeen([completionId]),
    // Drop it locally first so the next award shows immediately rather than
    // after a round trip; the refetch below reconciles.
    onMutate: (completionId: string) => {
      queryClient.setQueryData<RewardSummary[]>(PENDING_REWARDS_KEY, (prev = []) =>
        prev.filter(r => r.completion_id !== completionId))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_REWARDS_KEY })
      // The award changed the totals the rest of the page reads.
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationStats'] })
    },
  })

  return {
    /** The award to celebrate right now, or null. Oldest first. */
    current: pending[0] ?? null,
    /** How many are still waiting behind it. */
    remaining: Math.max(0, pending.length - 1),
    dismiss: (completionId: string) => acknowledge(completionId),
  }
}
