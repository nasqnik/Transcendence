import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { updateTaskStream, deleteTask } from '../../api/tasks'
import { type Task } from '../../constants/categories'
import Modal from '../Modal'
import ModalHeader from '../ModalHeader'
import StreamingView from './StreamingView'
import TaskFormFields from './TaskFormFields'
import { useTaskStream } from '../../hooks/useTaskStream'
import { useFocusOnSwap } from '../../hooks/useFocusOnSwap'

interface Props {
  task: Task
  onClose: () => void
}

export default function EditTaskModal({ task, onClose }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { status, errorKey, streamingText, run, fail } = useTaskStream(onClose)

  const [title, setTitle]             = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate]         = useState(task.due_date ?? '')
  const [confirming, setConfirming]   = useState(false)
  // Delete unmounts itself and mounts the confirm row in its place. Inside a
  // focus-trapped dialog, losing focus to <body> is worse than on a page: Tab
  // has nowhere sensible to resume from.
  const deleteAreaRef = useRef<HTMLDivElement>(null)
  useFocusOnSwap(deleteAreaRef, confirming)
  // Delete does not stream, so it keeps its own flag rather than widening the
  // hook's status with a state the create modal can never reach.
  const [deleting, setDeleting]       = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || status === 'streaming' || deleting) return

    // Send only what actually changed; nothing changed means nothing to save.
    const data: Record<string, unknown> = {}
    if (title.trim() !== task.title) data.title = title.trim()
    if (description.trim() !== (task.description ?? '')) data.description = description.trim()
    const newDue = dueDate || null
    if (newDue !== task.due_date) data.due_date = newDue
    if (Object.keys(data).length === 0) { onClose(); return }

    await run((onText, onDone, signal) =>
      updateTaskStream(task.id, data, onText, onDone, signal))
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTask(task.id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['completions'] })
      onClose()
    } catch {
      setDeleting(false)
      fail()
      setConfirming(false)
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="edit-task-heading" cardClassName="rounded-2xl w-full max-w-md mx-4">

      <ModalHeader id="edit-task-heading" title={t('tasks.editTask')} onClose={onClose} />

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

          {/* Keyed off the server's error code — see AddTaskModal. */}
          {status === 'error' && (
            <p role="alert" className="font-body text-sm text-danger-700">
              {t(errorKey)}
            </p>
          )}

          <button
            type="submit"
            disabled={!title.trim() || deleting}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 active:bg-primary-700 focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('tasks.saveTask')}
          </button>

          {/* Delete */}
          <div ref={deleteAreaRef}>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={deleting}
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
                className="min-h-11 px-2 inline-flex items-center font-body text-sm text-gray-500 hover:text-gray-700 focus-ring rounded"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="min-h-11 px-3 bg-danger-700 hover:opacity-90 text-white font-body text-sm font-semibold rounded-lg focus-ring transition-opacity disabled:opacity-50"
              >
                {deleting ? t('tasks.deleting') : t('tasks.deleteConfirmYes')}
              </button>
            </div>
          )}
          </div>

        </form>
      )}
    </Modal>
  )
}
