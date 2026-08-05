import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createTaskStream } from '../../api/tasks'
import { todayStr } from '../../utils/date'
import Modal from '../Modal'
import ModalHeader from '../ModalHeader'
import StreamingView from './StreamingView'
import TaskFormFields from './TaskFormFields'
import { useTaskStream } from '../../hooks/useTaskStream'

interface Props {
  onClose: () => void
}

export default function AddTaskModal({ onClose }: Props) {
  const { t } = useTranslation()
  const { status, errorKey, streamingText, run } = useTaskStream(onClose)

  const today = todayStr()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(today)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || status === 'streaming') return

    await run((onText, onDone, signal) => createTaskStream(
      { title: title.trim(), description: description.trim(), due_date: dueDate || null },
      onText, onDone, signal,
    ))
  }

  return (
    <Modal onClose={onClose} labelledBy="add-task-heading" cardClassName="rounded-2xl w-full max-w-md mx-4">

      <ModalHeader id="add-task-heading" title={t('tasks.createTask')} onClose={onClose} />

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

          {/* Error. Keyed off the server's error code, so a task rejected by
              content moderation says so instead of reading like a network
              failure the kid should retry. */}
          {status === 'error' && (
            <p role="alert" className="font-body text-sm text-danger-700">
              {t(errorKey)}
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
