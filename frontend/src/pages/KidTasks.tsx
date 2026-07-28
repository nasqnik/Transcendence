import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, getCompletions, deleteTask } from '../api/tasks'
import { type Task } from '../constants/categories'
import { groupTasks, latestCompletions } from '../utils/taskGroups'
import { todayStr, dateStrFromToday, localDateStr } from '../utils/date'
import { useTaskCompletion } from '../hooks/useTaskCompletion'
import { usePageTitle } from '../hooks/usePageTitle'
import TaskRow from '../components/kid/TaskRow'
import TaskToasts from '../components/kid/TaskToasts'
import EditTaskModal from '../components/kid/EditTaskModal'
import AddTaskModal from '../components/kid/AddTaskModal'
import StatsLog from '../components/kid/StatsLog'

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  id: string
  icon: string
  title: string
  tone?: 'danger' | 'default'
  /** Control shown at the end of the heading row, e.g. Select or Points Log. */
  action?: React.ReactNode
  children: React.ReactNode
}

function Section({ id, icon, title, tone = 'default', action, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="bg-white rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2
          id={id}
          className={`font-heading text-sm font-semibold flex items-center gap-1.5 ${
            tone === 'danger' ? 'text-danger-700' : 'text-gray-500'
          }`}
        >
          <span aria-hidden="true">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KidTasks() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  usePageTitle(`${t('tasks.allTasks')} — ${t('app.name')}`)

  const [selectMode, setSelectMode]   = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set<string>())
  const [confirming, setConfirming]   = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [addOpen, setAddOpen]         = useState(false)
  const [logOpen, setLogOpen]         = useState(false)

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  const { data: completions = [], isLoading: completionsLoading } = useQuery({ queryKey: ['completions'], queryFn: getCompletions })

  const { complete, lingering, displayCompletion, toastXp, toastError, showError } = useTaskCompletion(tasks)

  const { mutate: removeTasks } = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(deleteTask)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['completions'] })
    },
    onError: showError,
  })

  const isLoading      = tasksLoading || completionsLoading
  const today          = todayStr()
  const tomorrow       = dateStrFromToday(1)
  const completionInfo = latestCompletions(completions)
  const groups         = groupTasks(tasks, completions, today, lingering)

  // Tasks the kid can actually act on right now. Awaiting-approval ones are
  // deliberately excluded: nothing can be done about them until a parent looks.

  // Overdue leads the today list — most urgent first — and keeps its red date.
  const todayList = [...groups.overdue, ...groups.today]
  const overdueIds = new Set(groups.overdue.map(task => task.id))

  // Finished and approved today, newest first. Only today — the full history
  // is behind the Points Log button.
  const taskById = new Map(tasks.map(task => [task.id, task]))
  const doneToday = completions
    .filter(c => c.status === 'confirmed' && localDateStr(new Date(c.completed_at)) === today)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .flatMap(completion => {
      const task = taskById.get(completion.task)
      return task ? [{ completion, task }] : []
    })

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setConfirming(false)
  }

  function confirmDelete() {
    removeTasks([...selectedIds])
    exitSelectMode()
  }

  function formatDueDate(dateStr: string) {
    if (dateStr === today) return t('kidDash.todaysTasks')
    if (dateStr === tomorrow) return t('kidDash.tomorrow')
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const selectedCount = selectedIds.size

  function renderList(list: Task[], labelledBy: string, className = '', overdueIds?: ReadonlySet<string>) {
    return (
      <ul className="flex flex-col gap-2" aria-labelledby={labelledBy}>
        {list.map(task => {
          const shown = displayCompletion(task.id, completionInfo.get(task.id))
          const isOverdue = overdueIds?.has(task.id) ?? false
          // Late or sent back — both need attention, so both carry the tint.
          // Ticking one clears it straight away, since `shown` flips to done.
          const needsAttention = shown?.status === 'rejected' || isOverdue
          return (
            <TaskRow
              key={task.id}
              task={task}
              completionInfo={shown}
              onComplete={complete}
              overdue={isOverdue}
              showAiSummary
              selectMode={selectMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={toggleSelect}
              onEdit={() => setEditingTask(task)}
              className={`rounded-xl transition-colors ${
                className || (needsAttention ? 'bg-danger-50' : 'hover:bg-gray-50')
              }`}
            />
          )
        })}
      </ul>
    )
  }

  return (
    <main
      id="main-content"
      aria-labelledby="all-tasks-heading"
      className="flex-1 w-full flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 overflow-auto"
    >
      {/* Header — actions now sit on the sections they act on */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 id="all-tasks-heading" className="font-heading text-2xl font-bold text-gray-900">
          {selectMode ? t('tasks.selectedCount', { count: selectedCount }) : t('tasks.allTasks')}
        </h1>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-gray-400 py-10 text-center">{t('tasks.loading')}</p>
      ) : (
        <>
        {/* Left: work to do. Right: what is done or waiting on someone
            else. Stacked order on narrow screens stays urgent-first. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">

          <div className="flex flex-col gap-3 sm:gap-4">

            {/* Always rendered: it owns Add, Select and the delete bar, so it
                has to exist even on a day with nothing due — otherwise a kid
                with no tasks would have no way to create one. Overdue sits
                here too, flagged by its red date, rather than in a bucket of
                its own: a late task is simply today's most urgent work. */}
            <Section
              id="today-heading"
              icon="📋"
              title={t('kidDash.todaysTasks')}
              action={tasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                  className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded-lg px-2 py-1"
                >
                  {selectMode ? t('common.cancel') : t('tasks.select')}
                </button>
              )}
            >
              {!selectMode && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mb-3 w-full py-2.5 rounded-xl bg-primary-50 text-primary-700 font-body font-semibold text-sm hover:bg-primary-100 active:bg-primary-100 focus-ring transition-colors"
                >
                  {t('kidDash.addTask')}
                </button>
              )}

              {todayList.length > 0 ? (
                renderList(todayList, 'today-heading', '', overdueIds)
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                  <span className="text-4xl" aria-hidden="true">
                    {tasks.length === 0 ? '📋' : '🎉'}
                  </span>
                  <p className="font-heading font-bold text-gray-900">
                    {tasks.length === 0 ? t('kidDash.noTasks') : t('kidDash.allDone')}
                  </p>
                  <p className="font-body text-sm text-gray-400">
                    {tasks.length === 0
                      ? t('kidDash.noTasksHint')
                      : groups.pending.length > 0
                        ? t('tasks.pendingReview')
                        : t('kidDash.allDoneHint')}
                  </p>
                </div>
              )}

              {/* Delete lives with the tasks it removes, not in a page-level bar */}
              {selectMode && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {confirming ? (
                    <div role="group" aria-label={t('tasks.deleteConfirmMany', { count: selectedCount })} className="flex items-center gap-2 flex-wrap">
                      <p className="flex-1 font-body text-sm font-semibold text-gray-700">
                        {t('tasks.deleteConfirmMany', { count: selectedCount })}
                      </p>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="font-body text-sm font-semibold text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg focus-ring"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={confirmDelete}
                        className="font-body text-sm font-semibold text-white bg-danger-700 hover:opacity-90 px-4 py-2 rounded-lg focus-ring transition-opacity"
                      >
                        {t('tasks.deleteConfirmYes')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      disabled={selectedCount === 0}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger-700 text-white font-body font-semibold text-sm hover:opacity-90 focus-ring transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                      </svg>
                      {t('tasks.deleteSelected', { count: selectedCount })}
                    </button>
                  )}
                </div>
              )}
            </Section>

            {groups.upcoming.length > 0 && (
              <Section id="upcoming-heading" icon="📅" title={t('kidDash.upcoming')}>
                <ul className="flex flex-col gap-2" aria-labelledby="upcoming-heading">
                  {groups.upcoming.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      completionInfo={displayCompletion(task.id, completionInfo.get(task.id))}
                      onComplete={complete}
                      dueLabel={formatDueDate(task.due_date!)}
                      showAiSummary
                      selectMode={selectMode}
                      selected={selectedIds.has(task.id)}
                      onToggleSelect={toggleSelect}
                      onEdit={() => setEditingTask(task)}
                      className="rounded-xl hover:bg-gray-50 transition-colors"
                    />
                  ))}
                </ul>
              </Section>
            )}

            {groups.anytime.length > 0 && (
              <Section id="anytime-heading" icon="📌" title={t('kidDash.anytime')}>
                {renderList(groups.anytime, 'anytime-heading')}
              </Section>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Last: nothing here is actionable until a parent reviews it. */}
            {groups.pending.length > 0 && (
              <Section id="pending-heading" icon="⏳" title={t('kidDash.taskPending')}>
                {renderList(groups.pending, 'pending-heading', 'bg-amber-50 hover:bg-amber-50')}
              </Section>
            )}

            {/* Today only, with the full history behind Points Log. Rendered
                even on an empty day so that history stays reachable — the log
                covers every day, not just this one. */}
            <Section
              id="done-today-heading"
              icon="✅"
              title={t('kidDash.doneToday')}
              action={
                <button
                  type="button"
                  onClick={() => setLogOpen(true)}
                  aria-haspopup="dialog"
                  className="flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 px-3 py-1 font-body text-xs font-semibold hover:bg-teal-100 focus-ring transition-colors"
                >
                  <span aria-hidden="true">✓</span>
                  {t('kidDash.pointsLog')}
                </button>
              }
            >
              {doneToday.length === 0 ? (
                <p className="font-body text-sm text-gray-400 py-2">{t('kidDash.noPointsLog')}</p>
              ) : (
                <ul className="flex flex-col gap-2" aria-labelledby="done-today-heading">
                  {doneToday.map(({ task, completion }) => (
                    <TaskRow
                      key={completion.id}
                      task={task}
                      completionInfo={{ status: 'confirmed', review_note: completion.review_note }}
                      onComplete={complete}
                      // When it was finished, not when it was due — a task due
                      // last week but done today read as "Jul 25" under a
                      // heading that says "Done today".
                      dueLabel={new Date(completion.completed_at).toLocaleTimeString(
                        i18n.language, { hour: 'numeric', minute: '2-digit' },
                      )}
                      className="rounded-xl bg-teal-50"
                    />
                  ))}
                </ul>
              )}
            </Section>
          </div>

        </div>
        </>
      )}

      <TaskToasts xp={toastXp} error={toastError} />

      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} />}
      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />}
      {logOpen && <StatsLog onClose={() => setLogOpen(false)} />}
    </main>
  )
}
