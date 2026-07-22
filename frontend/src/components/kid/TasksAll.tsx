import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type Task } from '../../constants/categories'
import { type CompletionInfo } from '../../api/tasks'
import TaskRow from './TaskRow'
import EditTaskModal from './EditTaskModal'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useDismissable } from '../../hooks/useDismissable'

interface Props {
  tasks: Task[]
  completionInfo: Map<string, CompletionInfo>
  onComplete: (id: string) => void
  onDelete: (ids: string[]) => void
  onClose: () => void
}

export default function TasksAll({ tasks, completionInfo, onComplete, onDelete, onClose }: Props) {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set<string>())
  const [confirming, setConfirming] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useDismissable(cardRef, onClose, { enabled: !editingTask, handleEscape: false })
  useFocusTrap(cardRef, editingTask ? () => {} : onClose)

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
    onDelete([...selectedIds])
    exitSelectMode()
  }

  const selectedCount = selectedIds.size

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-all-heading"
        className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
      >

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="tasks-all-heading" className="font-heading text-xl font-bold text-gray-900">
            {selectMode ? t('tasks.selectedCount', { count: selectedCount }) : t('tasks.allTasks')}
          </h2>
          <div className="flex items-center gap-1">
            {tasks.length > 0 && (
              selectMode ? (
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="font-body text-sm font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg focus-ring"
                >
                  {t('common.cancel')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg focus-ring"
                >
                  {t('tasks.select')}
                </button>
              )
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 focus-ring transition-colors text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <ul className="overflow-y-auto flex flex-col divide-y divide-gray-50">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              completionInfo={completionInfo.get(task.id)}
              onComplete={onComplete}
              distinguishPending
              selectMode={selectMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={toggleSelect}
              onEdit={() => setEditingTask(task)}
              showAiSummary
              className="px-1"
            />
          ))}
        </ul>

        {/* Delete toolbar (select mode only) */}
        {selectMode && (
          <div className="border-t border-gray-100 px-6 py-4">
            {confirming ? (
              <div role="group" aria-label={t('tasks.deleteConfirmMany', { count: selectedCount })} className="flex items-center gap-3">
                <p className="font-body text-sm font-semibold text-gray-700 flex-1">
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
                  className="font-body text-sm font-semibold text-white bg-danger-700 hover:opacity-90 active:opacity-90 px-4 py-2 rounded-lg focus-ring transition-opacity"
                >
                  {t('tasks.deleteConfirmYes')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-danger-700 text-white font-body font-semibold text-sm hover:opacity-90 active:opacity-90 focus-ring transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                </svg>
                {t('tasks.deleteSelected', { count: selectedCount })}
              </button>
            )}
          </div>
        )}

      </div>
    </div>

    {editingTask && (
      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
      />
    )}
    </>
  )
}
