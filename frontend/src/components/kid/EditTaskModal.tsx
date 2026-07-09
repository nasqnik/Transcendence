import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { updateTaskStream, deleteTask } from '../../api/tasks'
import { type Task } from '../../constants/categories'
import Modal from '../Modal'
import StreamingView from './StreamingView'
import TaskFormFields from './TaskFormFields'

interface Props {
  task: Task
  onClose: () => void
}

export default function EditTaskModal({ task, onClose }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [title, setTitle]             = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate]         = useState(task.due_date ?? '')
  const [status, setStatus]           = useState<'idle' | 'streaming' | 'deleting' | 'error'>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [confirming, setConfirming]   = useState(false)
  const abortRef                      = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || status === 'streaming' || status === 'deleting') return

    const data: Record<string, unknown> = {}
    if (title.trim() !== task.title) data.title = title.trim()
    if (description.trim() !== (task.description ?? '')) data.description = description.trim()
    const newDue = dueDate || null
    if (newDue !== task.due_date) data.due_date = newDue

    if (Object.keys(data).length === 0) { onClose(); return }

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('streaming')
    setStreamingText('')

    try {
      await updateTaskStream(
        task.id,
        data,
        (text) => setStreamingText(prev => prev + text),
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          onClose()
        },
        controller.signal,
      )
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      setStatus('error')
    }
  }

  async function handleDelete() {
    setStatus('deleting')
    try {
      await deleteTask(task.id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      onClose()
    } catch {
      setStatus('error')
      setConfirming(false)
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="edit-task-heading" cardClassName="rounded-2xl w-full max-w-md mx-4">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 id="edit-task-heading" className="font-heading text-xl font-bold text-gray-900">
          {t('tasks.editTask')}
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

      {/* Streaming view */}
      {status === 'streaming' ? (
        <StreamingView title={title} streamingText={streamingText} />
      ) : (
        /* Form */
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">

          <TaskFormFields
            idPrefix="edit-task"
            title={title}
            description={description}
            dueDate={dueDate}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onDueDateChange={setDueDate}
          />

          {status === 'error' && (
            <p role="alert" className="font-body text-sm text-danger-700">
              {t('errors.generic')}
            </p>
          )}

          <button
            type="submit"
            disabled={!title.trim() || status === 'deleting'}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 active:bg-primary-700 focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('tasks.saveTask')}
          </button>

          {/* Delete */}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={status === 'deleting'}
              className="w-full py-2 rounded-xl font-body text-sm font-semibold text-danger-700 hover:bg-danger-50 focus-ring transition-colors disabled:opacity-50"
            >
              {t('tasks.deleteTask')}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-danger-50 p-3">
              <p className="flex-1 font-body text-sm text-danger-700 font-semibold">
                {t('tasks.deleteConfirm')}
              </p>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-body text-sm text-gray-500 hover:text-gray-700 focus-ring rounded px-2 py-1"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={status === 'deleting'}
                className="bg-danger-700 hover:opacity-90 text-white font-body text-sm font-semibold px-3 py-1.5 rounded-lg focus-ring transition-opacity disabled:opacity-50"
              >
                {status === 'deleting' ? t('tasks.deleting') : t('tasks.deleteConfirmYes')}
              </button>
            </div>
          )}

        </form>
      )}
    </Modal>
  )
}
