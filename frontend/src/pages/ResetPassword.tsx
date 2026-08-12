import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../api/auth'
import { getApiErrorKey, getFieldErrors } from '../api/errors'
import { validatePasswordField, isEmpty } from '../utils/validation'
import { usePageTitle } from '../hooks/usePageTitle'
import AuthCard from '../components/AuthCard'
import AuthMessageLayout from '../components/AuthMessageLayout'
import FormField from '../components/FormField'
import FormAlert from '../components/FormAlert'
import Button from '../components/Button'

interface Props {
  /** Which endpoint to confirm against — fixed by the route the email links to. */
  role: 'parent' | 'kid'
}

/**
 * Set a new password from an emailed link.
 *
 * Mounted at two routes because auth-service sends two different links:
 * `/reset-password?token=` for a parent and `/kid/reset-password?token=` for a
 * kid. The role cannot be inferred from the token, so it comes from the route.
 */
export default function ResetPassword({ role }: Props) {
  const { t } = useTranslation()
  usePageTitle(t('auth.resetPassword'))

  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Display text, not a key: an expired link and a malformed one are different
  // messages, and the server already sends both — translated by getFieldErrors.
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Above the early returns, because hooks cannot run conditionally. Each of
  // these views replaces the form entirely, taking the focused control with it;
  // AuthCard gives its heading tabIndex={-1} for exactly this.
  const headingId = !token ? 'reset-invalid-heading' : done ? 'reset-done-heading' : null
  useEffect(() => {
    if (headingId) document.getElementById(headingId)?.focus()
  }, [headingId])

  // A link with no token cannot be completed, so say that up front instead of
  // letting someone type a password into a form that will always fail.
  if (!token) {
    return (
      <AuthMessageLayout
        headingId="reset-invalid-heading"
        icon="🔗"
        title={t('auth.resetLinkInvalidTitle')}
        alertMessage={t('errors.api.passwordResetTokenInvalid')}
      >
        <Link
          to="/forgot-password"
          className="mt-2 inline-flex min-h-11 items-center font-body text-sm font-semibold text-primary-600 underline hover:text-primary-700 focus-ring rounded"
        >
          {t('auth.requestNewLink')}
        </Link>
      </AuthMessageLayout>
    )
  }

  if (done) {
    return (
      <AuthMessageLayout
        headingId="reset-done-heading"
        icon="✅"
        title={t('auth.resetDoneTitle')}
        statusMessage={t('auth.resetDoneTitle')}
      >
        <p className="font-body text-sm text-gray-700">{t('auth.resetDoneHint')}</p>
        <Link
          to="/login"
          className="mt-4 inline-flex min-h-11 items-center font-body text-sm font-semibold text-primary-600 underline hover:text-primary-700 focus-ring rounded"
        >
          {t('auth.backToLogin')}
        </Link>
      </AuthMessageLayout>
    )
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const pwError = validatePasswordField(password, t)
    if (pwError) errs.password = pwError
    if (isEmpty(confirm)) errs.confirm = t('errors.required')
    else if (confirm !== password) errs.confirm = t('auth.passwordsDoNotMatch')
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    setFieldErrors({})
    setError(null)
    setIsLoading(true)
    try {
      await confirmPasswordReset(role, token, password)
      setDone(true)
    } catch (err) {
      // A bad token comes back under `token`, which has no field on this form —
      // surface it as the form-level error rather than dropping it. Using the
      // translated text as-is keeps the server's distinction between a link
      // that expired ("request a new one") and one that was never valid;
      // collapsing both onto one key threw that away.
      const fields = getFieldErrors(err)
      if (fields.token) setError(fields.token)
      else if (fields.new_password) setFieldErrors({ password: fields.new_password })
      else setError(t(getApiErrorKey(err)))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard headingId="reset-heading" title={t('auth.resetPassword')}>
      <p className="font-body text-sm text-gray-700 mb-4">{t('auth.resetPasswordHint')}</p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={isLoading}>
        {error && <FormAlert message={error} />}

        <FormField
          id="new-password"
          label={t('auth.newPassword')}
          type="password"
          value={password}
          required
          autoComplete="new-password"
          disabled={isLoading}
          error={fieldErrors.password}
          onChange={e => { setPassword(e.target.value); setFieldErrors({}) }}
        />
        <FormField
          id="confirm-password"
          label={t('auth.confirmPassword')}
          type="password"
          value={confirm}
          required
          autoComplete="new-password"
          disabled={isLoading}
          error={fieldErrors.confirm}
          onChange={e => { setConfirm(e.target.value); setFieldErrors({}) }}
        />

        <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('auth.saving') : t('auth.resetPassword')}
        </Button>
      </form>
    </AuthCard>
  )
}
