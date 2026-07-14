import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewCompletion } from '../../api/parent'
import type { Completion } from '../../constants/categories'
import Button from '../Button'

interface ReviewModalProps {
  completion: Completion
  onClose: () => void
}

export default function ReviewModal({ completion, onClose }: ReviewModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const { mutate: doReview, isPending } = useMutation({
    mutationFn: (reviewStatus: 'confirmed' | 'rejected') =>
      reviewCompletion(completion.id, { status: reviewStatus, review_note: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentCompletions'] })
      onClose()
    },
  })

  const submittedDate = new Date(completion.completed_at).toLocaleDateString()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5">
        <div>
          <h2 id="review-modal-title" className="font-heading text-xl font-bold text-gray-900">
            {t('tasks.pendingApprovals')}
          </h2>
          <p className="font-body text-sm text-gray-500 mt-1">
            {t('parentDash.submittedAt', { date: submittedDate })}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="review-note" className="font-body text-sm font-semibold text-gray-700">
            {t('parentDash.reviewNote')}
          </label>
          <textarea
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="…"
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => doReview('confirmed')}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? t('parentDash.reviewing') : t('parentDash.approve')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => doReview('rejected')}
            disabled={isPending}
            className="flex-1"
          >
            {t('parentDash.reject')}
          </Button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="text-center font-body text-sm text-gray-400 hover:text-gray-600 focus-ring rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
