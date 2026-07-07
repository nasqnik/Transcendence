import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getCompletions, postCompletion, deleteTask, type CompletionInfo } from '../../api/tasks'
import { CATEGORY_STYLE, primaryCategory } from '../../constants/categories'
import TaskRow from './TaskRow'
import TasksAll from './TasksAll'
import AddTaskModal from './AddTaskModal'

// ─── Component ────────────────────────────────────────────────────────────────

export default function TodaysTasks() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [viewAllOpen, setViewAllOpen] = useState(false)
  const [addOpen, setAddOpen]         = useState(false)
  const [toastXp, setToastXp]           = useState<number | null>(null)
  const toastTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toastError, setToastError]     = useState(false)
  const toastErrorTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
  const in7Days  = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })()

  const { data: tasks       = [], isLoading: tasksLoading       } = useQuery({ queryKey: ['tasks'],       queryFn: getTasks })
  const { data: completions = [], isLoading: completionsLoading } = useQuery({ queryKey: ['completions'], queryFn: getCompletions })

  const { mutate: complete } = useMutation({
    mutationFn: postCompletion,
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationStats'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] })
      const xp = tasks.find(t => t.id === taskId)?.xp_reward ?? 0
      if (xp > 0) {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToastXp(xp)
        toastTimer.current = setTimeout(() => setToastXp(null), 2000)
      }
    },
    onError: () => {
      if (toastErrorTimer.current) clearTimeout(toastErrorTimer.current)
      setToastError(true)
      toastErrorTimer.current = setTimeout(() => setToastError(false), 3000)
    },
  })

  const { mutate: removeTasks } = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(deleteTask)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['completions'] })
    },
    onError: () => {
      if (toastErrorTimer.current) clearTimeout(toastErrorTimer.current)
      setToastError(true)
      toastErrorTimer.current = setTimeout(() => setToastError(false), 3000)
    },
  })

  const isLoading = tasksLoading || completionsLoading

  // Most recent completion per task
  const completionInfo = new Map<string, CompletionInfo>()
  const sorted = [...completions].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )
  for (const c of sorted) {
    if (!completionInfo.has(c.task)) {
      completionInfo.set(c.task, { status: c.status, review_note: c.review_note })
    }
  }

  // pending + confirmed = done (hide from main list); rejected = show again
  const completedIds = new Set(
    completions
      .filter(c => c.status === 'pending' || c.status === 'confirmed')
      .map(c => c.task)
  )

  const todaysTasks  = tasks.filter(task => task.due_date === today)
  const pendingTasks = todaysTasks.filter(task => !completedIds.has(task.id))
  const overdueTasks = tasks.filter(task =>
    task.due_date !== null && task.due_date < today && !completedIds.has(task.id)
  )
  const undatedTasks = tasks.filter(task =>
    task.due_date === null && !completedIds.has(task.id)
  )
  const upcomingTasks = tasks
    .filter(task => task.due_date !== null && task.due_date > today && task.due_date <= in7Days)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))

  function formatUpcomingDate(dateStr: string) {
    if (dateStr === tomorrow) return t('kidDash.tomorrow')
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })
  }

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
                aria-label={t('kidDash.tasksRemaining', { count: pendingTasks.length })}
              >
                {pendingTasks.length}
              </span>
            )}
          </div>
          {todaysTasks.length > 0 && (
            <button
              type="button"
              className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
              onClick={() => setViewAllOpen(true)}
            >
              {t('kidDash.viewAll')}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
          </div>
        ) : todaysTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-5xl" aria-hidden="true">📋</span>
            <p className="font-heading font-bold text-gray-900">{t('kidDash.noTasks')}</p>
            <p className="font-body text-sm text-gray-400">{t('kidDash.noTasksHint')}</p>
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-5xl" aria-hidden="true">🎉</span>
            <p className="font-heading font-bold text-gray-900">{t('kidDash.allDone')}</p>
            <p className="font-body text-sm text-gray-400">{t('kidDash.allDoneHint')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t('kidDash.todaysTasks')}>
            {pendingTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                completionInfo={completionInfo.get(task.id)}
                onComplete={complete}
                className="rounded-xl hover:bg-gray-50 transition-colors"
              />
            ))}
          </ul>
        )}

        {!isLoading && overdueTasks.length > 0 && (
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p
              id="missed-tasks-label"
              className="font-heading text-sm font-semibold text-danger-700 mb-3 flex items-center gap-1.5"
            >
              <span aria-hidden="true">⚠️</span>
              {t('kidDash.missedTasks', { count: overdueTasks.length })}
            </p>
            <ul className="flex flex-col gap-2" aria-labelledby="missed-tasks-label">
              {overdueTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  completionInfo={completionInfo.get(task.id)}
                  onComplete={complete}
                  overdue
                  className="rounded-xl bg-danger-50 hover:bg-danger-50 transition-colors"
                />
              ))}
            </ul>
          </div>
        )}

        {!isLoading && upcomingTasks.length > 0 && (
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p
              id="upcoming-tasks-label"
              className="font-heading text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5"
            >
              <span aria-hidden="true">📅</span>
              {t('kidDash.upcoming')}
            </p>
            <ul className="flex flex-col gap-2" aria-labelledby="upcoming-tasks-label">
              {upcomingTasks.map(task => {
                const cat   = primaryCategory(task.category_rewards)
                const style = CATEGORY_STYLE[cat]
                return (
                  <li key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
                    <div
                      className={`w-8 h-8 rounded-xl ${style.bg} flex items-center justify-center text-sm shrink-0`}
                      aria-hidden="true"
                    >
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-semibold text-sm text-gray-700 truncate">{task.title}</p>
                      <p className="font-body text-xs text-gray-400">{formatUpcomingDate(task.due_date!)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-amber-50 rounded-full px-2.5 py-1">
                      <span aria-hidden="true" className="text-xs">⭐</span>
                      <span className="font-body font-bold text-xs text-amber-700">+{task.xp_reward}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!isLoading && undatedTasks.length > 0 && (
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p
              id="anytime-tasks-label"
              className="font-heading text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5"
            >
              <span aria-hidden="true">📌</span>
              {t('kidDash.anytime')}
            </p>
            <ul className="flex flex-col gap-2" aria-labelledby="anytime-tasks-label">
              {undatedTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  completionInfo={completionInfo.get(task.id)}
                  onComplete={complete}
                  className="rounded-xl hover:bg-gray-50 transition-colors"
                />
              ))}
            </ul>
          </div>
        )}

        {!isLoading && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-4 w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 active:bg-primary-700 focus-ring transition-colors"
          >
            {t('kidDash.addTask')}
          </button>
        )}
      </section>

      {toastXp !== null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-400 text-white font-heading font-bold text-lg px-6 py-3 rounded-2xl shadow-lg pointer-events-none select-none"
        >
          <span aria-hidden="true">⭐</span>
          +{toastXp} XP
          <span className="sr-only">{t('kidDash.xpEarned', { xp: toastXp })}</span>
        </div>
      )}

      {toastError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-danger-700 text-white font-body font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg pointer-events-none select-none"
        >
          <span aria-hidden="true">⚠️</span>
          {t('errors.generic')}
        </div>
      )}

      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} />}

      {viewAllOpen && (
        <TasksAll
          tasks={todaysTasks}
          completionInfo={completionInfo}
          onComplete={complete}
          onDelete={removeTasks}
          onClose={() => setViewAllOpen(false)}
        />
      )}
    </>
  )
}
