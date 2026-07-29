import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getTasks, getCompletions } from '../../api/tasks'
import { groupTasks, latestCompletions } from '../../utils/taskGroups'
import { todayStr } from '../../utils/date'
import { useTaskCompletion } from '../../hooks/useTaskCompletion'
import TaskRow from './TaskRow'
import TaskToasts from './TaskToasts'
import AddTaskModal from './AddTaskModal'

/**
 * Dashboard card: only what the kid can do *today*. Missed, rejected, upcoming
 * and undated tasks live on the tasks page so this stays short and actionable.
 */
export default function TodaysTasks() {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  const { data: tasks       = [], isLoading: tasksLoading       } = useQuery({ queryKey: ['tasks'],       queryFn: getTasks })
  const { data: completions = [], isLoading: completionsLoading } = useQuery({ queryKey: ['completions'], queryFn: getCompletions })

  const { complete, lingering, displayCompletion, toastXp, toastError } = useTaskCompletion(tasks)

  const isLoading      = tasksLoading || completionsLoading
  const today          = todayStr()
  const completionInfo = latestCompletions(completions)
  const todaysTasks    = groupTasks(tasks, completions, today, lingering).today

  // Nothing left today reads as "all done" only if something was actually
  // finished; otherwise there was simply nothing due.
  const finishedToday = tasks.filter(task => {
    if (task.due_date !== today) return false
    const status = completionInfo.get(task.id)?.status
    return status === 'confirmed' || status === 'pending'
  }).length

  // When the hold-up is a parent rather than the kid, say so.
  const awaitingParent = groupTasks(tasks, completions, today).pending.length > 0

  return (
    <>
      <section aria-labelledby="tasks-heading" className="bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 id="tasks-heading" className="font-heading text-xl font-bold text-gray-900">
              {t('kidDash.todaysTasks')}
            </h2>
            {!isLoading && (
              <span
                role="status"
                aria-live="polite"
                className="bg-primary-600 text-white font-body font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center"
                aria-label={t('kidDash.tasksRemaining', { count: todaysTasks.length })}
              >
                {todaysTasks.length}
              </span>
            )}
          </div>
          {!isLoading && tasks.length > 0 && (
            <Link
              to="/tasks"
              className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
            >
              {t('kidDash.viewAll')}
            </Link>
          )}
        </div>

        {!isLoading && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            // Tinted rather than solid: the hero above already owns the loud
            // purple, and a second full-width block was fighting it for
            // attention above the tasks themselves.
            className="mb-3 w-full py-2.5 rounded-xl bg-primary-50 text-primary-700 font-body font-semibold text-sm hover:bg-primary-100 active:bg-primary-100 focus-ring transition-colors"
          >
            {t('kidDash.addTask')}
          </button>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
          </div>
        ) : todaysTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-5xl" aria-hidden="true">{finishedToday > 0 ? '🎉' : '📋'}</span>
            <p className="font-heading font-bold text-gray-900">
              {finishedToday > 0 ? t('kidDash.allDone') : t('kidDash.noTasks')}
            </p>
            <p className="font-body text-sm text-gray-400">
              {awaitingParent
                ? t('tasks.pendingReview')
                : finishedToday > 0 ? t('kidDash.allDoneHint') : t('kidDash.noTasksHint')}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t('kidDash.todaysTasks')}>
            {todaysTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                completionInfo={displayCompletion(task.id, completionInfo.get(task.id))}
                onComplete={complete}
                className="rounded-xl hover:bg-gray-50 transition-colors"
              />
            ))}
          </ul>
        )}

      </section>

      <TaskToasts xp={toastXp} error={toastError} />

      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} />}
    </>
  )
}
