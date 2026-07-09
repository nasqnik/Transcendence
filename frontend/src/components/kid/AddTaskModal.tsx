import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { createTaskStream } from '../../api/tasks'
import { todayStr } from '../../utils/date'
import Modal from '../Modal'
import StreamingView from './StreamingView'
import TaskFormFields from './TaskFormFields'

interface Props {
  onClose: () => void
}

export default function AddTaskModal({ onClose }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const today = todayStr()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(today)
  const [status, setStatus] = useState<'idle' | 'streaming' | 'error'>('idle')
  const [streamingText, setStreamingText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || status === 'streaming') return

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('streaming')
    setStreamingText('')

    try {
      await createTaskStream(
        { title: title.trim(), description: description.trim(), due_date: dueDate || null },
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

  return (
    <Modal onClose={onClose} labelledBy="add-task-heading" cardClassName="rounded-2xl w-full max-w-md mx-4">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 id="add-task-heading" className="font-heading text-xl font-bold text-gray-900">
          {t('tasks.createTask')}
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
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

          <TaskFormFields
            idPrefix="task"
            title={title}
            description={description}
            dueDate={dueDate}
            minDate={today}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onDueDateChange={setDueDate}
          />

          {/* AI hint */}
          <p className="font-body text-xs text-gray-400">
            <span aria-hidden="true">✨</span> {t('tasks.aiHint')}
          </p>

          {/* Error */}
          {status === 'error' && (
            <p role="alert" className="font-body text-sm text-danger-700">
              {t('errors.generic')}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 active:bg-primary-700 focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('tasks.createTaskSubmit')}
          </button>

        </form>
      )}
    </Modal>
  )
}
