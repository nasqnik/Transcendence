import { useTranslation } from 'react-i18next'

interface Props {
  /** Prefixes the field ids so label/input pairs stay unique per modal. */
  idPrefix: string
  title: string
  description: string
  dueDate: string
  /** Earliest selectable due date (omit to allow any date). */
  minDate?: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onDueDateChange: (value: string) => void
}

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-300 font-body text-sm text-gray-900 placeholder-gray-400 focus-ring outline-none'

/** Shared title / description / due-date inputs for the Add and Edit task modals. */
export default function TaskFormFields({
  idPrefix,
  title,
  description,
  dueDate,
  minDate,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
}: Props) {
  const { t } = useTranslation()

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-title`} className="font-body text-sm font-semibold text-gray-700">
          {t('tasks.title')}
        </label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          required
          autoFocus
          className={INPUT}
          placeholder={t('tasks.title')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-description`} className="font-body text-sm font-semibold text-gray-700">
          {t('tasks.description')}
        </label>
        <textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          rows={3}
          className={`${INPUT} resize-none`}
          placeholder={t('tasks.description')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-due-date`} className="font-body text-sm font-semibold text-gray-700">
          {t('tasks.dueDateLabel')}
        </label>
        <input
          id={`${idPrefix}-due-date`}
          type="date"
          value={dueDate}
          min={minDate}
          onChange={e => onDueDateChange(e.target.value)}
          className={INPUT}
        />
      </div>
    </>
  )
}
