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
import LoadError from '../LoadError'

/**
 * Dashboard card: only what the kid can do *today*. Missed, rejected, upcoming
 * and undated tasks live on the tasks page so this stays short and actionable.
 */
export default function TodaysTasks() {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  const tasksQuery       = useQuery({ queryKey: ['tasks'],       queryFn: getTasks })
  const completionsQuery = useQuery({ queryKey: ['completions'], queryFn: getCompletions })

  const { data: tasks = [], isLoading: tasksLoading } = tasksQuery
  const { data: completions = [], isLoading: completionsLoading } = completionsQuery
  const loadFailed = tasksQuery.isError || completionsQuery.isError

  const { complete, lingering, displayCompletion, toastXp, toastError } = useTaskCompletion(tasks)

  const isLoading      = tasksLoading || completionsLoading
  const today          = todayStr()
  const completionInfo = latestCompletions(completions)
  const todaysTasks    = groupTasks(tasks, completions, today, lingering).today

  // The day's scoreboard. Counted from the tasks themselves rather than from
  // the rendered list, so the linger window — which holds a ticked task on
  // screen for a moment — can't make a task count as both done and to-do.
  const dueToday = tasks.filter(task => task.due_date === today)
  const finishedToday = dueToday.filter(task => {
    const status = completionInfo.get(task.id)?.status
    return status === 'confirmed' || status === 'pending'
  }).length
  const goalPercent = dueToday.length > 0
    ? Math.round((finishedToday / dueToday.length) * 100)
    : 0

  // When the hold-up is a parent rather than the kid, say so.
  const awaitingParent = groupTasks(tasks, completions, today).pending.length > 0
  // Work that exists but isn't due today: overdue, scheduled ahead, or undated.
  // Counted so the empty state can say "not here" rather than "not at all".
  const groups = groupTasks(tasks, completions, today, lingering)
  const elsewhere = groups.overdue.length + groups.upcoming.length + groups.anytime.length

  return (
    <>
      <section aria-labelledby="tasks-heading" className="bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 id="tasks-heading" className="font-heading text-xl font-bold text-gray-900">
              {t('kidDash.todaysTasks')}
            </h2>
            {!isLoading && !loadFailed && (
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
          {!isLoading && !loadFailed && tasks.length > 0 && (
            <Link
              to="/tasks"
              className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
            >
              {t('kidDash.viewAll')}
            </Link>
          )}
        </div>

        {/* The one goal on this page that can actually be finished today.
            Level and XP are cumulative and a long way off; "2 of 5" is close
            enough to be worth chasing, and it resets every morning. */}
        {!isLoading && !loadFailed && dueToday.length > 0 && (
          <div className={`mb-4 rounded-2xl px-4 py-3 ${goalPercent === 100 ? 'bg-teal-50' : 'bg-primary-50'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              {/* Always the plain count, even at 100% — the empty state below
                  already carries the "all done!" headline, and having both say
                  it was the same sentence twice in a row. Here the colour and
                  the 🎉 do the celebrating; the words stay factual. */}
              <span className="font-heading font-bold text-sm text-gray-900">
                <span aria-hidden="true" className="me-1.5">{goalPercent === 100 ? '🎉' : '⭐'}</span>
                {t('kidDash.goalProgress', { done: finishedToday, total: dueToday.length })}
              </span>
              <span className="font-body text-xs font-bold text-gray-700 shrink-0">{goalPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={t('kidDash.goalProgress', { done: finishedToday, total: dueToday.length })}
              aria-valuenow={finishedToday}
              aria-valuemin={0}
              aria-valuemax={dueToday.length}
              className="h-3 bg-white rounded-full overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${goalPercent === 100 ? 'bg-teal-500' : 'bg-primary-500'}`}
                style={{ width: `${goalPercent}%` }}
              />
            </div>
          </div>
        )}

        {!isLoading && !loadFailed && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            // Dashed outline, not a tinted fill: the goal strip above is
            // already primary-50, and two stacked tinted blocks read as one.
            // The outline also says "add something here" rather than looking
            // like a third status panel.
            className="mb-3 w-full py-2.5 rounded-xl border-2 border-dashed border-primary-100 bg-white text-primary-700 font-body font-semibold text-sm hover:bg-primary-50 hover:border-primary-500 active:bg-primary-50 focus-ring transition-colors"
          >
            {t('kidDash.addTask')}
          </button>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
          </div>
        ) : loadFailed ? (
          <LoadError onRetry={() => { tasksQuery.refetch(); completionsQuery.refetch() }} />
        ) : todaysTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            {/* Emoji, headline and hint now come from a single decision. They
                used to be picked separately — the headline from tasks due
                today, the hint from pending ones — so a kid whose only tasks
                were submitted on some other day saw "No tasks for today"
                sitting directly above "Waiting for parent approval". Read
                together those contradict each other, and neither says where
                the tasks actually went. */}
            {finishedToday > 0 ? (
              <>
                <span className="text-5xl" aria-hidden="true">🎉</span>
                <p className="font-heading font-bold text-gray-900">{t('kidDash.allDone')}</p>
                <p className="font-body text-sm text-gray-400">
                  {awaitingParent ? t('tasks.pendingReview') : t('kidDash.allDoneHint')}
                </p>
              </>
            ) : awaitingParent ? (
              <>
                <span className="text-5xl" aria-hidden="true">⏳</span>
                <p className="font-heading font-bold text-gray-900">{t('tasks.pendingReview')}</p>
                {/* The one thing the old empty state never answered: where the
                    tasks are now. They sit in the tasks page's waiting column
                    until a parent gets to them. */}
                <Link
                  to="/tasks"
                  className="mt-1 font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded px-2 py-1"
                >
                  {t('tasks.allTasks')}
                </Link>
              </>
            ) : elsewhere > 0 ? (
              // Nothing due today is not the same as having no tasks. A kid
              // whose work is all overdue, upcoming or undated was told "You
              // haven't added any tasks yet" while the sidebar badge counted
              // those very tasks — the same empty-vs-something lie as an error
              // rendering as an empty list.
              <>
                <span className="text-5xl" aria-hidden="true">📋</span>
                <p className="font-heading font-bold text-gray-900">{t('kidDash.noTasks')}</p>
                <p className="font-body text-sm text-gray-400">{t('kidDash.tasksElsewhere')}</p>
                <Link
                  to="/tasks"
                  className="mt-1 font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded px-2 py-1"
                >
                  {t('tasks.allTasks')}
                </Link>
              </>
            ) : (
              <>
                <span className="text-5xl" aria-hidden="true">📋</span>
                <p className="font-heading font-bold text-gray-900">{t('kidDash.noTasks')}</p>
                <p className="font-body text-sm text-gray-400">{t('kidDash.noTasksHint')}</p>
              </>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t('kidDash.todaysTasks')}>
            {todaysTasks.map(task => {
              const shown = displayCompletion(task.id, completionInfo.get(task.id))
              // Same tint the tasks page gives a sent-back task. Without it a
              // rejection looked routine here and urgent one click away, which
              // is the sort of drift that makes two screens feel like two apps.
              const needsAttention = shown?.status === 'rejected'
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  completionInfo={shown}
                  onComplete={complete}
                  className={`rounded-xl transition-colors ${
                    needsAttention ? 'bg-danger-50' : 'hover:bg-gray-50'
                  }`}
                />
              )
            })}
          </ul>
        )}

      </section>

      <TaskToasts xp={toastXp} error={toastError} />

      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} />}
    </>
  )
}
