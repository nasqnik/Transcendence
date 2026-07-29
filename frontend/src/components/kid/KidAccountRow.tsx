import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors } from '../../api/errors'
import { useFormErrors } from '../../hooks/useFormErrors'
import FormField from '../FormField'
import Button from '../Button'

interface Props {
  id: string
  label: string
  value: string
  /** Server field name, so a validation error lands on the right input. */
  fieldKey: string
  autoComplete?: string
  save: (value: string) => Promise<unknown>
  onSaved?: (value: string) => void
}

/** One editable profile row: shows the value, swaps to a form on "Edit". */
export default function KidAccountRow({
  id, label, value, fieldKey, autoComplete, save, onSaved,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => save(draft.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kidMe'] })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.(draft.trim())
    },
    onError: (err) => setFieldErrors(getFieldErrors(err)),
  })

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="font-body text-sm text-gray-500">{label}</p>
          <p className="font-body text-sm font-semibold text-gray-900 truncate">{value}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saved && <span className="font-body text-xs text-teal-700">{t('kidDash.settingsSaved')}</span>}
          <button
            type="button"
            onClick={() => { setDraft(value); resetFieldErrors(); setEditing(true) }}
            className="font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('tasks.editBtn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); resetFieldErrors(); mutate() }}
      className="py-3 flex flex-col gap-3"
    >
      <FormField
        id={id}
        label={label}
        value={draft}
        autoComplete={autoComplete}
        error={fieldErrors[fieldKey]}
        onChange={(e) => { setDraft(e.target.value); clearFieldError(fieldKey) }}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={isPending} className="px-4 py-2 text-sm">
          {isPending ? t('kidDash.settingsSaving') : t('tasks.saveTask')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(false)}
          disabled={isPending}
          className="px-4 py-2 text-sm"
        >
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
