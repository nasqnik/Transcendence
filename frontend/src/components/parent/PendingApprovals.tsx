import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getParentCompletions } from '../../api/parent'
import type { Completion } from '../../constants/categories'
import ReviewModal from './ReviewModal'

export default function PendingApprovals() {
  const { t, i18n } = useTranslation()
  const [reviewing, setReviewing] = useState<Completion | null>(null)

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['parentCompletions'],
    queryFn: getParentCompletions,
  })

  const pending = completions.filter(c => c.status === 'pending')

  return (
    <>
      <section aria-labelledby="approvals-heading" className="bg-white rounded-2xl p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <h2 id="approvals-heading" className="font-heading text-xl font-bold text-gray-900">
            {t('parentDash.pendingApprovals')}
          </h2>
          {!isLoading && pending.length > 0 && (
            <span
              role="status"
              aria-live="polite"
              className="bg-primary-600 text-white font-body font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center"
              aria-label={`${pending.length} ${t('parentDash.pendingApprovals')}`}
            >
              {pending.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <ul className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2].map(i => (
              <li key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3.5 w-32 rounded-full bg-gray-100" />
                  <div className="h-3 w-20 rounded-full bg-gray-100" />
                </div>
                <div className="h-8 w-24 rounded-xl bg-gray-100" />
              </li>
            ))}
          </ul>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-5xl" aria-hidden="true">✅</span>
            <p className="font-heading font-bold text-gray-900">{t('parentDash.noPending')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map(c => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-50"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-gray-900 truncate">
                    {c.task_title || t('parentDash.untitledTask')}
                  </p>
                  <p className="font-body text-xs text-gray-400">
                    {c.task_due_date
                      ? t('parentDash.dueDate', {
                          date: new Date(c.task_due_date).toLocaleDateString(i18n.language),
                        })
                      : t('parentDash.noDueDate')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewing(c)}
                  className="shrink-0 font-body font-semibold text-sm px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 focus-ring transition-colors"
                >
                  {t('parentDash.approve')} / {t('parentDash.reject')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewing && (
        <ReviewModal completion={reviewing} onClose={() => setReviewing(null)} />
      )}
    </>
  )
}
