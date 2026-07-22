import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getParentCompletions } from '../../api/parent'
import type { Completion } from '../../constants/categories'
import Modal from '../Modal'

interface RecentlyReviewedProps {
  kidLabelFor: (kidId: string) => string
  showKidLabel: boolean
}

const MAX_ITEMS = 10

function StatusBadge({ confirmed, label }: { confirmed: boolean; label: string }) {
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs font-semibold ${
        confirmed ? 'bg-teal-50 text-teal-700' : 'bg-danger-50 text-danger-700'
      }`}
    >
      <span aria-hidden="true">{confirmed ? '✓' : '✗'}</span>
      {label}
    </span>
  )
}

export default function RecentlyReviewed({ kidLabelFor, showKidLabel }: RecentlyReviewedProps) {
  const { t, i18n } = useTranslation()
  const [viewing, setViewing] = useState<Completion | null>(null)

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['parentCompletions'],
    queryFn: getParentCompletions,
  })

  const reviewed = completions
    .filter(c => c.status === 'confirmed' || c.status === 'rejected')
    .sort((a, b) =>
      new Date(b.reviewed_at ?? b.completed_at).getTime() -
      new Date(a.reviewed_at ?? a.completed_at).getTime())
    .slice(0, MAX_ITEMS)

  const statusLabel = (c: Completion) =>
    c.status === 'confirmed' ? t('parentDash.confirmed') : t('parentDash.rejected')
  const reviewedDate = (c: Completion) =>
    new Date(c.reviewed_at ?? c.completed_at).toLocaleDateString(i18n.language)

  return (
    <>
      <section aria-labelledby="reviewed-heading" className="bg-white rounded-2xl p-6">
        <h2 id="reviewed-heading" className="font-heading text-xl font-bold text-gray-900 mb-4">
          {t('parentDash.recentlyReviewed')}
        </h2>

        {isLoading ? (
          <ul className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2].map(i => (
              <li key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3.5 w-32 rounded-full bg-gray-100" />
                  <div className="h-3 w-20 rounded-full bg-gray-100" />
                </div>
                <div className="h-6 w-20 rounded-full bg-gray-100" />
              </li>
            ))}
          </ul>
        ) : reviewed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-5xl" aria-hidden="true">🗂️</span>
            <p className="font-body text-sm text-gray-500">{t('parentDash.noReviewed')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {reviewed.map(c => {
              const confirmed = c.status === 'confirmed'
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setViewing(c)}
                    className="w-full text-start flex items-start gap-3 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 focus-ring transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                      📋
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold text-gray-900 truncate">
                        {c.task_title || t('parentDash.untitledTask')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {showKidLabel && (
                          <span className="inline-flex items-center gap-1 font-body text-xs font-semibold text-gray-600">
                            <span aria-hidden="true">👤</span>
                            {kidLabelFor(c.kid_id)}
                          </span>
                        )}
                        <span className="font-body text-xs text-gray-400">
                          {t('parentDash.reviewedAt', { date: reviewedDate(c) })}
                        </span>
                      </div>
                      {c.task_description && (
                        <p className="font-body text-xs text-gray-500 mt-1 line-clamp-1">{c.task_description}</p>
                      )}
                    </div>
                    <StatusBadge confirmed={confirmed} label={statusLabel(c)} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {viewing && (
        <Modal
          onClose={() => setViewing(null)}
          labelledBy="reviewed-modal-title"
          cardClassName="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
              📋
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="reviewed-modal-title" className="font-heading text-lg font-bold text-gray-900">
                {viewing.task_title || t('parentDash.untitledTask')}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusBadge confirmed={viewing.status === 'confirmed'} label={statusLabel(viewing)} />
                {showKidLabel && (
                  <span className="inline-flex items-center gap-1 font-body text-xs font-semibold text-gray-600">
                    <span aria-hidden="true">👤</span>
                    {kidLabelFor(viewing.kid_id)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="font-body text-sm text-gray-400">
            {viewing.task_due_date
              ? t('parentDash.dueDate', { date: new Date(viewing.task_due_date).toLocaleDateString(i18n.language) })
              : t('parentDash.noDueDate')}
            {' · '}
            {t('parentDash.reviewedAt', { date: reviewedDate(viewing) })}
          </p>

          {viewing.task_description && (
            <div className="flex flex-col gap-1">
              <p className="font-body text-xs font-semibold text-gray-500">{t('parentDash.description')}</p>
              <p className="font-body text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {viewing.task_description}
              </p>
            </div>
          )}

          {viewing.review_note && (
            <div className="flex flex-col gap-1">
              <p className="font-body text-xs font-semibold text-gray-500">{t('kidDash.parentNote')}</p>
              <p className="font-body text-sm text-gray-600 italic whitespace-pre-wrap">"{viewing.review_note}"</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setViewing(null)}
            className="text-center font-body text-sm text-gray-400 hover:text-gray-600 focus-ring rounded"
          >
            {t('common.close')}
          </button>
        </Modal>
      )}
    </>
  )
}
