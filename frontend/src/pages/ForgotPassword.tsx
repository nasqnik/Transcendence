import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import { isValidEmail, isEmpty } from '../utils/validation'
import { usePageTitle } from '../hooks/usePageTitle'
import AuthCard from '../components/AuthCard'
import AuthMessageLayout from '../components/AuthMessageLayout'
import FormField from '../components/FormField'
import FormAlert from '../components/FormAlert'
import Button from '../components/Button'

export default function ForgotPassword() {
  const { t } = useTranslation()
  usePageTitle(t('auth.forgotPassword'))

  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  // The form is swapped out for a status screen, taking the focused control
  // with it. AuthCard gives its heading tabIndex={-1} for exactly this — the
  // same move useTokenVerification makes on the verify screens.
  useEffect(() => {
    if (sent) document.getElementById('reset-sent-heading')?.focus()
  }, [sent])

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    if (isEmpty(email)) { setFieldError(t('errors.required')); return }
    if (!isValidEmail(email)) { setFieldError(t('errors.invalidEmail')); return }

    setFieldError(undefined)
    setErrorKey(null)
    setIsLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch {
      // Reached only when both endpoints failed, which means no mail was sent.
      // Saying "check your email" here would be a lie a person acts on.
      setErrorKey('errors.apiUnknown')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    // Deliberately the same screen whether or not that address has an account.
    // Saying "no account found" would turn this form into a way to test which
    // emails are registered.
    return (
      <AuthMessageLayout
        headingId="reset-sent-heading"
        icon="📬"
        title={t('auth.resetSentTitle')}
        statusMessage={t('auth.resetSentTitle')}
      >
        <p className="font-body text-sm text-gray-700">{t('auth.resetSentHint')}</p>
        <Link
          to="/login"
          className="mt-4 inline-flex min-h-11 items-center font-body text-sm font-semibold text-primary-600 underline hover:text-primary-700 focus-ring rounded"
        >
          {t('auth.backToLogin')}
        </Link>
      </AuthMessageLayout>
    )
  }

  return (
    <AuthCard headingId="forgot-heading" title={t('auth.forgotPassword')}>
      <p className="font-body text-sm text-gray-700 mb-4">{t('auth.forgotPasswordHint')}</p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={isLoading}>
        {errorKey && <FormAlert message={t(errorKey)} />}

        <FormField
          id="reset-email"
          label={t('auth.email')}
          type="email"
          value={email}
          required
          autoComplete="email"
          disabled={isLoading}
          error={fieldError}
          onChange={e => { setEmail(e.target.value); setFieldError(undefined) }}
        />

        <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-4 inline-flex min-h-11 items-center font-body text-sm font-semibold text-primary-600 underline hover:text-primary-700 focus-ring rounded"
      >
        {t('auth.backToLogin')}
      </Link>
    </AuthCard>
  )
}
