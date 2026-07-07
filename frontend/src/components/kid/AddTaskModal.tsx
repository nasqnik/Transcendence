import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { createTaskStream } from '../../api/tasks'
import Modal from '../Modal'

interface Props {
  onClose: () => void
}

export default function AddTaskModal({ onClose }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const today = new Date().toISOString().slice(0, 10)

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
        <div className="p-6 flex flex-col gap-4">
          <p className="font-body text-sm font-semibold text-primary-600" aria-live="polite">
            <span aria-hidden="true">✨</span> {t('tasks.aiThinking')}
          </p>
          <p className="font-heading text-base font-bold text-gray-900">{title}</p>
          <div
            aria-live="polite"
            aria-label={t('tasks.aiThinking')}
            className="min-h-20 rounded-xl bg-gray-50 border border-gray-200 p-3 font-body text-sm text-gray-700 leading-relaxed"
          >
            {streamingText}
            <span
              aria-hidden="true"
              className="inline-block w-0.5 h-[1em] bg-primary-500 animate-pulse ms-0.5 align-text-bottom"
            />
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label htmlFor="task-title" className="font-body text-sm font-semibold text-gray-700">
              {t('tasks.title')}
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-body text-sm text-gray-900 placeholder-gray-400 focus-ring outline-none"
              placeholder={t('tasks.title')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label htmlFor="task-description" className="font-body text-sm font-semibold text-gray-700">
              {t('tasks.description')}
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-body text-sm text-gray-900 placeholder-gray-400 focus-ring outline-none resize-none"
              placeholder={t('tasks.description')}
            />
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1">
            <label htmlFor="task-due-date" className="font-body text-sm font-semibold text-gray-700">
              {t('tasks.dueDateLabel')}
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              min={today}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-body text-sm text-gray-900 focus-ring outline-none"
            />
          </div>

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
