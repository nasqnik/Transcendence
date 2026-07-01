import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getCompletions, postCompletion, type CompletionInfo } from '../../api/tasks'
import TaskRow from './TaskRow'
import TasksAll from './TasksAll'
import AddTaskModal from './AddTaskModal'

// ─── Component ────────────────────────────────────────────────────────────────

export default function TodaysTasks() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [viewAllOpen, setViewAllOpen] = useState(false)
  const [addOpen, setAddOpen]         = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const { data: tasks       = [], isLoading: tasksLoading       } = useQuery({ queryKey: ['tasks'],       queryFn: getTasks })
  const { data: completions = [], isLoading: completionsLoading } = useQuery({ queryKey: ['completions'], queryFn: getCompletions })

  const { mutate: complete } = useMutation({
    mutationFn: postCompletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationStats'] })
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] })
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

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="mt-4 w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 active:bg-primary-700 focus-ring transition-colors"
        >
          {t('kidDash.addTask')}
        </button>
      </section>

      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} />}

      {viewAllOpen && (
        <TasksAll
          tasks={todaysTasks}
          completionInfo={completionInfo}
          onComplete={complete}
          onClose={() => setViewAllOpen(false)}
        />
      )}
    </>
  )
}
