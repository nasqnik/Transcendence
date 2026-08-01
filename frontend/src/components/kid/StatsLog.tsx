import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import LoadError from '../LoadError'
import { type TaskCategory, CATEGORY_STYLE } from '../../constants/categories'
import { getTasks, getCompletions } from '../../api/tasks'
import Modal from '../Modal'
import ModalHeader from '../ModalHeader'

interface Props {
  onClose: () => void
}

export default function StatsLog({ onClose }: Props) {
  const { t, i18n } = useTranslation()

  // Both served from cache — no extra requests
  const tasksQuery       = useQuery({ queryKey: ['tasks'],       queryFn: getTasks })
  const completionsQuery = useQuery({ queryKey: ['completions'], queryFn: getCompletions })
  const { data: tasks = [] } = tasksQuery
  const { data: completions = [] } = completionsQuery
  const loadFailed = tasksQuery.isError || completionsQuery.isError

  const taskMap = new Map(tasks.map(task => [task.id, task]))

  const log = completions
    .filter(c => c.status !== 'rejected')
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  return (
    <Modal onClose={onClose} labelledBy="points-log-heading" cardClassName="rounded-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">

      <ModalHeader id="points-log-heading" title={t('kidDash.pointsLog')} onClose={onClose} />

      {/* List */}
      {loadFailed ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <LoadError onRetry={() => { tasksQuery.refetch(); completionsQuery.refetch() }} />
        </div>
      ) : log.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
          <span className="text-4xl" aria-hidden="true">📭</span>
          <p className="font-body text-sm text-gray-400">{t('kidDash.noPointsLog')}</p>
        </div>
      ) : (
        <ul className="overflow-y-auto flex flex-col divide-y divide-gray-50">
          {log.map(completion => {
            const task = taskMap.get(completion.task)
            if (!task) return null

            const date = new Date(completion.completed_at).toLocaleDateString(
              i18n.language,
              { day: 'numeric', month: 'short' }
            )

            return (
              <li key={completion.id} className="flex items-center gap-3 px-6 py-3">

                {/* Title + date + the parent's note, if they left one */}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-sm text-gray-900 truncate">
                    {task.title}
                  </p>
                  <p className="font-body text-xs text-gray-400 mt-0.5">{date}</p>
                  {completion.review_note && (
                    <p className="font-body text-xs text-gray-500 italic mt-1">
                      &ldquo;{completion.review_note}&rdquo;
                    </p>
                  )}
                </div>

                {/* Points breakdown per category */}
                <div className="flex items-center gap-2 shrink-0">
                  {task.category_rewards.map(reward => (
                    <span
                      key={reward.category}
                      className={`font-body text-xs font-bold ${CATEGORY_STYLE[reward.category as TaskCategory]?.text ?? 'text-gray-500'}`}
                    >
                      +{reward.points_value}
                      <span aria-hidden="true"> {CATEGORY_STYLE[reward.category as TaskCategory]?.icon}</span>
                    </span>
                  ))}
                </div>

                {/* Status */}
                {completion.status === 'confirmed' ? (
                  <span role="img" aria-label={t('kidDash.statusConfirmed')} className="text-teal-700 text-base shrink-0">✓</span>
                ) : (
                  <span role="img" aria-label={t('kidDash.statusPendingReview')} className="text-amber-700 text-base shrink-0">⏳</span>
                )}

              </li>
            )
          })}
        </ul>
      )}

    </Modal>
  )
}
