import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { requestEmailChange } from '../../api/account'
import { getFieldErrors } from '../../api/errors'
import { useFormErrors } from '../../hooks/useFormErrors'
import FormField from '../FormField'
import FormActions from '../FormActions'

interface Props {
  email: string
  pendingEmail: string | null
  emailVerified: boolean
}

/**
 * Email row: the address is read-only on the profile endpoint, so changing it
 * goes through the confirm-by-link flow (a link is sent to the new address).
 */
export default function KidEmailRow({ email, pendingEmail, emailVerified }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  // The form unmounts on save or cancel, taking the focused control with it.
  // Focus goes back to the button that opened it.
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(editing)
  useEffect(() => {
    if (wasEditing.current && !editing) editTriggerRef.current?.focus()
    wasEditing.current = editing
  }, [editing])
  const [value, setValue] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => requestEmailChange(value.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kidMe'] })
      setSentTo(value.trim())
      setEditing(false)
      setValue('')
    },
    onError: (err) => setFieldErrors(getFieldErrors(err)),
  })

  return (
    <div className="py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-sm text-gray-500">{t('auth.email')}</p>
          <p className="font-body text-sm font-semibold text-gray-900 truncate">
            {email}
            {emailVerified && (
              <span className="ms-2 font-body text-xs font-semibold text-teal-700">
                <span aria-hidden="true">✓</span> {t('parentDash.verified')}
              </span>
            )}
          </p>
        </div>
        {!editing && (
          <button
            ref={editTriggerRef}
            type="button"
            onClick={() => { setValue(''); resetFieldErrors(); setSentTo(null); setEditing(true) }}
            className="shrink-0 min-h-11 -my-2 px-2 inline-flex items-center font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('parentDash.changeEmail')}
          </button>
        )}
      </div>

      {pendingEmail && (
        <p className="font-body text-xs text-amber-700">
          {t('parentDash.emailPending', { email: pendingEmail })}
        </p>
      )}

      {sentTo && (
        <p className="font-body text-xs text-teal-700">
          {t('parentDash.emailChangeSent', { email: sentTo })}
        </p>
      )}

      {editing && (
        <form
          onSubmit={(e) => { e.preventDefault(); resetFieldErrors(); mutate() }}
          className="flex flex-col gap-3"
        >
          <FormField
            id="kid-new-email"
            label={t('parentDash.newEmail')}
            type="email"
            value={value}
            autoComplete="email"
            error={fieldErrors.email}
            onChange={(e) => { setValue(e.target.value); clearFieldError('email') }}
          />
          <FormActions
            submitLabel={t('tasks.saveTask')}
            pendingLabel={t('kidDash.settingsSaving')}
            busy={isPending}
            onCancel={() => setEditing(false)}
          />
        </form>
      )}
    </div>
  )
}
