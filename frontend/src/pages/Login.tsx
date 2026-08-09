import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { attemptDualRoleLogin } from '../auth/loginFlow'
import AuthCard from '../components/AuthCard'
import AuthMessageLayout from '../components/AuthMessageLayout'
import GoogleSignInSection from '../components/GoogleSignInSection'
import Button from '../components/Button'
import FormAlert from '../components/FormAlert'
import FormField from '../components/FormField'
import { useFormErrors } from '../hooks/useFormErrors'
import { usePageTitle } from '../hooks/usePageTitle'
import { isEmpty } from '../utils/validation'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle(t('auth.login'))
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [errorKey, setErrorKey]     = useState<string | null>(null)
  const [isLoading, setIsLoading]   = useState(false)
  const [waitingForParent, setWaitingForParent] = useState(false)

  useEffect(() => {
    if (waitingForParent) document.getElementById('waiting-heading')?.focus()
  }, [waitingForParent])

  async function runLogin(credentials: Parameters<typeof attemptDualRoleLogin>[0]) {
    setErrorKey(null)
    resetFieldErrors()
    setWaitingForParent(false)
    setIsLoading(true)
    try {
      const result = await attemptDualRoleLogin(credentials, navigate)
      if (result.status === 'waiting_for_parent') setWaitingForParent(true)
      else if (result.status === 'error') setErrorKey(result.errorKey)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (isEmpty(identifier)) errs.identifier = t('errors.required')
    if (isEmpty(password))   errs.password   = t('errors.required')
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    await runLogin({ type: 'password', identifier, password })
  }

  if (waitingForParent) {
    return (
      <AuthMessageLayout
        headingId="waiting-heading"
        icon="📬"
        title={t('auth.waitingForParent')}
        statusMessage={t('auth.waitingForParent')}
      >
        <p className="font-body text-sm text-gray-500 text-center w-full">
          {t('auth.waitingForParentHintGeneric')}
        </p>
        <Button variant="primary" className="w-full" onClick={() => setWaitingForParent(false)}>
          {t('auth.tryLoginAgain')}
        </Button>
        <Button variant="secondary" className="w-full" to="/">
          {t('auth.backToHome')}
        </Button>
      </AuthMessageLayout>
    )
  }

  return (
    <AuthCard headingId="login-heading" title={t('auth.login')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
        aria-labelledby="login-heading"
        aria-busy={isLoading}
      >
        {errorKey && <FormAlert message={t(errorKey)} />}

        <FormField
          id="identifier"
          label={t('auth.emailOrUsername')}
          type="text"
          dir="ltr"
          value={identifier}
          // Label already reads "Email or username"; repeating that here
          // overflowed the field on a phone ("…or your usernam‹").
          placeholder={t('auth.emailHint')}
          required
          autoComplete="username"
          disabled={isLoading}
          error={fieldErrors.identifier}
          onChange={e => { setIdentifier(e.target.value); clearFieldError('identifier') }}
        />

        <FormField
          id="password"
          label={t('auth.password')}
          type="password"
          value={password}
          required
          autoComplete="current-password"
          disabled={isLoading}
          error={fieldErrors.password}
          onChange={e => { setPassword(e.target.value); clearFieldError('password') }}
        />

        <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('auth.loggingIn') : t('auth.login')}
        </Button>

        {/* Inside the form and directly after the button: someone reaches for
            this the moment a password fails, so it belongs where that attempt
            ended rather than below the Google section. */}
        <Link
          to="/forgot-password"
          className="self-center min-h-11 inline-flex items-center font-body text-sm font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
        >
          {t('auth.forgotPassword')}
        </Link>
      </form>

      <GoogleSignInSection
        disabled={isLoading}
        onSuccess={credential => runLogin({ type: 'google', credential })}
        onError={() => { resetFieldErrors(); setErrorKey('errors.api.invalidGoogleToken') }}
      />

      <div className="flex flex-col items-center gap-3 pt-1">
        <p className="font-body text-sm text-gray-500 text-center">
          {t('auth.noAccount')}{' '}
          <Link
            to="/signup"
            className="font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded-sm"
            aria-label={t('a11y.goToSignup')}
          >
            {t('nav.signup')}
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
