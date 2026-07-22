import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewCompletion } from '../../api/parent'
import type { Completion } from '../../constants/categories'
import Modal from '../Modal'
import Button from '../Button'

interface ReviewModalProps {
  completion: Completion
  onClose: () => void
}

export default function ReviewModal({ completion, onClose }: ReviewModalProps) {
  const { t, i18n } = useTranslation()
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

  return (
    <Modal
      onClose={onClose}
      labelledBy="review-modal-title"
      cardClassName="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5"
    >
      {/* Task header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
          📋
        </div>
        <div className="min-w-0">
          <h2 id="review-modal-title" className="font-heading text-lg font-bold text-gray-900 truncate">
            {completion.task_title || t('parentDash.untitledTask')}
          </h2>
          <p className="font-body text-sm text-gray-400">
            {completion.task_due_date
              ? t('parentDash.dueDate', {
                  date: new Date(completion.task_due_date).toLocaleDateString(i18n.language),
                })
              : t('parentDash.noDueDate')}
          </p>
        </div>
      </div>

      {/* Task description */}
      {completion.task_description && (
        <p className="font-body text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {completion.task_description}
        </p>
      )}

      {/* Review note */}
      <div className="flex flex-col gap-2">
        <label htmlFor="review-note" className="font-body text-sm font-semibold text-gray-700">
          {t('parentDash.reviewNote')}
        </label>
        <textarea
          id="review-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 font-body text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => doReview('confirmed')} disabled={isPending} className="flex-1">
          {isPending ? t('parentDash.reviewing') : t('parentDash.approve')}
        </Button>
        <Button variant="secondary" onClick={() => doReview('rejected')} disabled={isPending} className="flex-1">
          {t('parentDash.reject')}
        </Button>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={isPending}
        className="text-center font-body text-sm text-gray-400 hover:text-gray-600 focus-ring rounded"
      >
        {t('common.close')}
      </button>
    </Modal>
  )
}
