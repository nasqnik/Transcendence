import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '../../api/account'
import { getFieldErrors } from '../../api/errors'
import { useFormErrors } from '../../hooks/useFormErrors'
import FormField from '../FormField'
import FormActions from '../FormActions'
import { Link } from 'react-router-dom'

interface Props {
  /** False for a Google-only account, which sets a first password instead. */
  hasPassword: boolean
}

export default function KidPasswordSection({ hasPassword }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The form unmounts on save or cancel, taking the focused control with it.
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) editTriggerRef.current?.focus()
    wasOpen.current = open
  }, [open])
  useEffect(() => () => { if (doneTimer.current) clearTimeout(doneTimer.current) }, [])
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const { mutate, isPending } = useMutation({
    mutationFn: () => changePassword({
      ...(hasPassword ? { current_password: current } : {}),
      new_password: next,
    }),
    onSuccess: () => {
      setDone(true)
      if (doneTimer.current) clearTimeout(doneTimer.current)
      setOpen(false)
      setCurrent(''); setNext(''); setConfirm('')
      doneTimer.current = setTimeout(() => setDone(false), 2500)
    },
    onError: (err) => setFieldErrors(getFieldErrors(err)),
  })

  function submit(e: React.SubmitEvent) {
    e.preventDefault()
    resetFieldErrors()
    if (next !== confirm) {
      setFieldErrors({ confirm: t('parentDash.passwordMismatch') })
      return
    }
    mutate()
  }

  const heading = hasPassword ? t('parentDash.changePassword') : t('parentDash.setPassword')

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="font-body text-sm font-semibold text-gray-700">{heading}</p>
        <div className="flex items-center gap-3">
          {done && <span className="font-body text-xs text-teal-700">{t('parentDash.passwordChanged')}</span>}
          <button
            ref={editTriggerRef}
            type="button"
            onClick={() => { resetFieldErrors(); setOpen(true) }}
            className="min-h-11 -my-2 px-2 inline-flex items-center font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('tasks.editBtn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="font-body text-sm font-semibold text-gray-700">{heading}</p>
      {hasPassword && (
        <div className="flex flex-col gap-1">
          <FormField
            id="kid-current-password"
            label={t('parentDash.currentPassword')}
            type="password"
            value={current}
            autoComplete="current-password"
            error={fieldErrors.current_password}
            onChange={(e) => { setCurrent(e.target.value); clearFieldError('current_password') }}
          />
          {/* The way out of the one dead end this form has: changing a password
              needs the old one, so a kid who has forgotten it cannot proceed
              and has nothing else to try. */}
          <Link
            to="/forgot-password"
            className="self-start min-h-11 -my-1 inline-flex items-center font-body text-xs font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
      )}
      <FormField
        id="kid-new-password"
        label={t('parentDash.newPassword')}
        type="password"
        value={next}
        autoComplete="new-password"
        error={fieldErrors.new_password}
        onChange={(e) => { setNext(e.target.value); clearFieldError('new_password') }}
      />
      <FormField
        id="kid-confirm-password"
        label={t('parentDash.confirmPassword')}
        type="password"
        value={confirm}
        autoComplete="new-password"
        error={fieldErrors.confirm}
        onChange={(e) => { setConfirm(e.target.value); clearFieldError('confirm') }}
      />
      <FormActions
        submitLabel={t('tasks.saveTask')}
        pendingLabel={t('kidDash.settingsSaving')}
        busy={isPending}
        onCancel={() => setOpen(false)}
      />
    </form>
  )
}
