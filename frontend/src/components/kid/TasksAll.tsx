import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { type Task } from '../../constants/categories'
import { type CompletionInfo } from '../../api/tasks'
import TaskRow from './TaskRow'
import { useFocusTrap } from '../../hooks/useFocusTrap'

interface Props {
  tasks: Task[]
  completionInfo: Map<string, CompletionInfo>
  onComplete: (id: string) => void
  onClose: () => void
}

export default function TasksAll({ tasks, completionInfo, onComplete, onClose }: Props) {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [expandedIds, setExpandedIds] = useState(new Set<string>())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!cardRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useFocusTrap(cardRef, onClose)

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
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
            {t('kidDash.todaysTasks')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 focus-ring transition-colors text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <ul className="overflow-y-auto flex flex-col divide-y divide-gray-50">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              completionInfo={completionInfo.get(task.id)}
              onComplete={onComplete}
              distinguishPending
              expanded={expandedIds.has(task.id)}
              onToggleExpand={() => toggleExpand(task.id)}
              className="px-1"
            />
          ))}
        </ul>

      </div>
    </div>
  )
}
