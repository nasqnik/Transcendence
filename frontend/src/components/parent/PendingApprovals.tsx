import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getParentCompletions } from '../../api/parent'
import type { Completion } from '../../constants/categories'
import ReviewModal from './ReviewModal'

export default function PendingApprovals() {
  const { t } = useTranslation()
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
              className="bg-danger-500 text-white font-body font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center"
              aria-label={`${pending.length} pending`}
            >
              {pending.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-4xl" aria-hidden="true">✅</span>
            <p className="font-body text-sm text-gray-500">{t('parentDash.noPending')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map(c => (
              <li
                key={c.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-gray-900">
                    {t('parentDash.submittedAt', {
                      date: new Date(c.completed_at).toLocaleDateString(),
                    })}
                  </p>
                  <p className="font-body text-xs text-gray-400 font-mono truncate">
                    {c.task.slice(0, 8)}…
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewing(c)}
                  className="shrink-0 font-body font-semibold text-sm px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-ring transition-colors"
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
