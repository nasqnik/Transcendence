import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors } from '../../api/errors'
import { useFormErrors } from '../../hooks/useFormErrors'
import FormField from '../FormField'
import FormActions from '../FormActions'

interface Props {
  id: string
  label: string
  value: string
  /** Server field name, so a validation error lands on the right input. */
  fieldKey: string
  autoComplete?: string
  /** 'ltr' for usernames: an Arabic page otherwise reorders Latin text as it is typed. */
  dir?: 'ltr' | 'rtl'
  save: (value: string) => Promise<unknown>
  onSaved?: (value: string) => void
}

/** One editable profile row: shows the value, swaps to a form on "Edit". */
export default function KidAccountRow({
  id, label, value, fieldKey, autoComplete, dir, save, onSaved,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The form unmounts on save or cancel, taking the focused control with it.
  // Focus goes back to the Edit button that opened it.
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(editing)
  useEffect(() => {
    if (wasEditing.current && !editing) editTriggerRef.current?.focus()
    wasEditing.current = editing
  }, [editing])
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => save(draft.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kidMe'] })
      setEditing(false)
      setSaved(true)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 2000)
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
            ref={editTriggerRef}
            type="button"
            onClick={() => { setDraft(value); resetFieldErrors(); setEditing(true) }}
            className="min-h-11 -my-2 px-2 inline-flex items-center font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
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
        dir={dir}
        error={fieldErrors[fieldKey]}
        onChange={(e) => { setDraft(e.target.value); clearFieldError(fieldKey) }}
      />
      <FormActions
        submitLabel={t('tasks.saveTask')}
        pendingLabel={t('kidDash.settingsSaving')}
        busy={isPending}
        onCancel={() => setEditing(false)}
      />
    </form>
  )
}
