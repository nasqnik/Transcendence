import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import AuthCard from '../components/AuthCard'
import AuthMessageLayout from '../components/AuthMessageLayout'
import GoogleSignInSection from '../components/GoogleSignInSection'
import LegalLinks from '../components/LegalLinks'
import Button from '../components/Button'
import FormAlert from '../components/FormAlert'
import FormField from '../components/FormField'
import { establishParentSession } from '../auth/session'
import {
  registerParent,
  loginWithGoogle,
  signupKid,
  signupKidWithGoogle,
  type KidSignupResponse,
} from '../api/auth'
import { getApiErrorKey, getFieldErrors } from '../api/errors'
import { useFormErrors } from '../hooks/useFormErrors'
import { usePageTitle } from '../hooks/usePageTitle'
import { isEmpty, isValidEmail, validatePasswordField } from '../utils/validation'

// ── Terms checkbox ──────────────────────────────────────────────────────────
// Module-level so it keeps a stable component identity across Signup renders
// (a nested component would remount its subtree on every keystroke).

interface TermsCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
  error?: string
  errorId: string
}

function TermsCheckbox({ checked, onChange, disabled, error, errorId }: TermsCheckboxProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 accent-primary-600"
        />
        <span className="font-body text-sm text-gray-600">
          {t('auth.agreeToTermsPrefix')}{' '}
          <Link to="/terms" target="_blank" rel="noopener" className="text-primary-600 hover:text-primary-700 underline focus-ring rounded-sm">
            {t('legal.terms')}
          </Link>{' '}
          {t('common.and')}{' '}
          <Link to="/privacy" target="_blank" rel="noopener" className="text-primary-600 hover:text-primary-700 underline focus-ring rounded-sm">
            {t('legal.privacy')}
          </Link>
        </span>
      </label>
      {error && (
        <p id={errorId} className="font-body text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle(`${t('auth.signup')} — ${t('app.name')}`)

  const [role, setRole]               = useState<'parent' | 'kid' | null>(null)
  const [username, setUsername]       = useState('')
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [kidEmail, setKidEmail]       = useState('')
  const [password, setPassword]       = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [errorKey, setErrorKey]       = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading]         = useState(false)

  const [parentPendingEmail, setParentPendingEmail] = useState<string | null>(null)
  const [kidPending, setKidPending]                 = useState<KidSignupResponse | null>(null)
  const [kidParentEmail, setKidParentEmail]         = useState('')
  const [kidGoogleToken, setKidGoogleToken]         = useState<string | null>(null)

  useEffect(() => {
    if (role !== null) document.getElementById('username')?.focus()
  }, [role])

  useEffect(() => {
    if (parentPendingEmail) document.getElementById('verify-heading')?.focus()
  }, [parentPendingEmail])

  useEffect(() => {
    if (kidPending) document.getElementById('waiting-heading')?.focus()
  }, [kidPending])

  useEffect(() => {
    if (kidGoogleToken) document.getElementById('google-profile-heading')?.focus()
  }, [kidGoogleToken])

  function selectRole(next: 'parent' | 'kid') {
    setRole(next)
    setErrorKey(null)
    resetFieldErrors()
    setUsername('')
    setName('')
    setEmail('')
    setKidEmail('')
    setPassword('')
    setParentEmail('')
    setAgreedToTerms(false)
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (isEmpty(username)) errs.username = t('errors.required')
    if (role === 'kid' && isEmpty(name)) errs.name = t('errors.required')
    if (role === 'parent') {
      if (isEmpty(email)) errs.email = t('errors.required')
      else if (!isValidEmail(email)) errs.email = t('errors.invalidEmail')
    }
    if (role === 'kid') {
      if (isEmpty(kidEmail)) errs.kidEmail = t('errors.required')
      else if (!isValidEmail(kidEmail)) errs.kidEmail = t('errors.invalidEmail')
    }
    const passwordError = validatePasswordField(password, t, {
      username,
      email: role === 'parent' ? email : kidEmail,
    })
    if (passwordError) errs.password = passwordError
    if (role === 'kid') {
      if (isEmpty(parentEmail)) errs.parentEmail = t('errors.required')
      else if (!isValidEmail(parentEmail)) errs.parentEmail = t('errors.invalidEmail')
    }
    if (!agreedToTerms) errs.agreedToTerms = t('errors.mustAgreeToTerms')
    return errs
  }

  function validateGoogleKid(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (isEmpty(name)) errs.name = t('errors.required')
    if (isEmpty(username)) errs.username = t('errors.required')
    if (isEmpty(parentEmail)) errs.parentEmail = t('errors.required')
    else if (!isValidEmail(parentEmail)) errs.parentEmail = t('errors.invalidEmail')
    if (!agreedToTerms) errs.agreedToTerms = t('errors.mustAgreeToTerms')
    return errs
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    if (!role) return
    setErrorKey(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    resetFieldErrors()
    setIsLoading(true)
    try {
      if (role === 'parent') {
        await registerParent(email, username, password)
        setParentPendingEmail(email)
      } else {
        const result = await signupKid(name, username, kidEmail, password, parentEmail)
        setKidParentEmail(parentEmail)
        setKidPending(result)
      }
    } catch (err) {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length > 0) { setFieldErrors(fields); return }
      setErrorKey(getApiErrorKey(err))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleKidSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    if (!kidGoogleToken) return
    setErrorKey(null)
    const errs = validateGoogleKid()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    resetFieldErrors()
    setIsLoading(true)
    try {
      const result = await signupKidWithGoogle(kidGoogleToken, name, username, parentEmail)
      setKidParentEmail(parentEmail)
      setKidPending(result)
    } catch (err) {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length > 0) { setFieldErrors(fields); return }
      setErrorKey(getApiErrorKey(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Post-submit screens ───────────────────────────────────────────────────

  if (parentPendingEmail) {
    return (
      <AuthMessageLayout
        headingId="verify-heading"
        icon="📬"
        title={t('auth.verifyYourEmail')}
        statusMessage={t('auth.verifyYourEmail')}
      >
        <p className="font-body text-sm text-gray-500 text-center w-full">
          {t('auth.verifyEmailHint', { email: parentPendingEmail })}
        </p>
        <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
          {t('auth.backToHome')}
        </Button>
        <p className="font-body text-sm text-gray-500 text-center">
          {t('auth.verifyEmailAlready')}{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded-sm">
            {t('auth.login')}
          </Link>
        </p>
      </AuthMessageLayout>
    )
  }

  if (kidPending) {
    const emailVerified = kidPending.email_verified
    return (
      <AuthMessageLayout
        headingId="waiting-heading"
        icon="📬"
        title={emailVerified ? t('auth.waitingForParent') : t('auth.almostThere')}
        statusMessage={emailVerified ? t('auth.waitingForParent') : t('auth.almostThere')}
      >
        {!emailVerified && (
          <p className="font-body text-sm text-gray-500 text-center w-full">
            {t('auth.kidStep1', { email: kidPending.email })}
          </p>
        )}
        <p className="font-body text-sm text-gray-500 text-center w-full">
          {emailVerified
            ? t('auth.waitingForParentHint', { email: kidParentEmail })
            : t('auth.kidStep2', { email: kidParentEmail })}
        </p>
        <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
          {t('auth.backToHome')}
        </Button>
      </AuthMessageLayout>
    )
  }

  // ── Kid Google "complete profile" screen ──────────────────────────────────

  if (kidGoogleToken) {
    return (
      <AuthMessageLayout
        headingId="google-profile-heading"
        icon="👤"
        title={t('auth.completeProfile')}
      >
        <form
          noValidate
          className="flex w-full flex-col gap-4"
          onSubmit={handleGoogleKidSubmit}
          aria-labelledby="google-profile-heading"
          aria-busy={isLoading}
        >
          {errorKey && <FormAlert message={t(errorKey)} />}
          <FormField id="name" label={t('auth.name')} type="text" value={name} required autoComplete="name" disabled={isLoading} error={fieldErrors.name} onChange={e => { setName(e.target.value); clearFieldError('name') }} />
          <FormField id="username" label={t('auth.username')} type="text" dir="ltr" value={username} required autoComplete="username" disabled={isLoading} error={fieldErrors.username} onChange={e => { setUsername(e.target.value); clearFieldError('username') }} />
          <FormField id="parentEmail" label={t('auth.parentEmail')} type="email" value={parentEmail} placeholder={t('auth.emailHint')} required autoComplete="off" disabled={isLoading} error={fieldErrors.parentEmail} onChange={e => { setParentEmail(e.target.value); clearFieldError('parentEmail') }} />
          <TermsCheckbox
            checked={agreedToTerms}
            onChange={v => { setAgreedToTerms(v); clearFieldError('agreedToTerms') }}
            disabled={isLoading}
            error={fieldErrors.agreedToTerms}
            errorId="terms-error-google"
          />
          <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.signingUp') : t('auth.signup')}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => { setKidGoogleToken(null); setErrorKey(null); resetFieldErrors() }}>
            {t('auth.back')}
          </Button>
        </form>
      </AuthMessageLayout>
    )
  }

  // ── Main signup form ──────────────────────────────────────────────────────

  const headerIcon = role === 'parent' ? '👨‍👩‍👧' : role === 'kid' ? '🧒' : '✨'

  return (
    <AuthCard headingId="signup-heading" title={t('auth.signup')} icon={headerIcon}>

      {/* Role selector */}
      <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
              <legend className="font-body text-sm font-semibold text-gray-700 w-full">
                {t('auth.roleSelector')}
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(['parent', 'kid'] as const).map(r => (
                  <label
                    key={r}
                    className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl cursor-pointer border-2 transition-colors focus-within:ring-2 focus-within:ring-offset-2 ${
                      role === r
                        ? 'bg-primary-600 border-primary-600 text-white focus-within:ring-white'
                        : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 focus-within:ring-primary-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signup-role"
                      value={r}
                      checked={role === r}
                      onChange={() => selectRole(r)}
                      className="sr-only"
                    />
                    <span className="text-xl" aria-hidden="true">{r === 'parent' ? '👨‍👩‍👧' : '🧒'}</span>
                    <span className="font-body font-semibold text-sm">{t(`auth.${r === 'parent' ? 'parent' : 'child'}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Always-present live region; content set after role chosen so SR announces it */}
            <p className="sr-only" aria-live="polite" role="status">
              {role !== null ? t('a11y.signupFormReady') : ''}
            </p>

            {/* Form — appears after role selection */}
            {role !== null && (
              <>
                <form
                  noValidate
                  className="flex flex-col gap-4"
                  onSubmit={handleSubmit}
                  aria-labelledby="signup-heading"
                  aria-busy={isLoading}
                >
                  {errorKey && <FormAlert message={t(errorKey)} />}

                  <FormField id="username" label={t('auth.username')} type="text" dir="ltr" value={username} required autoComplete="username" disabled={isLoading} error={fieldErrors.username} onChange={e => { setUsername(e.target.value); clearFieldError('username') }} />

                  {role === 'kid' && <FormField id="name" label={t('auth.name')} type="text" value={name} required autoComplete="name" disabled={isLoading} error={fieldErrors.name} onChange={e => { setName(e.target.value); clearFieldError('name') }} />}

                  {role === 'parent'
                    ? <FormField id="email" label={t('auth.email')} type="email" value={email} placeholder={t('auth.emailHint')} required autoComplete="email" disabled={isLoading} error={fieldErrors.email} onChange={e => { setEmail(e.target.value); clearFieldError('email') }} />
                    : <FormField id="kidEmail" label={t('auth.email')} type="email" value={kidEmail} placeholder={t('auth.emailHint')} required autoComplete="email" disabled={isLoading} error={fieldErrors.kidEmail} onChange={e => { setKidEmail(e.target.value); clearFieldError('kidEmail') }} />
                  }

                  <FormField id="password" label={t('auth.password')} type="password" value={password} required autoComplete="new-password" disabled={isLoading} error={fieldErrors.password} onChange={e => { setPassword(e.target.value); clearFieldError('password') }} />

                  {role === 'kid' && <FormField id="parentEmail" label={t('auth.parentEmail')} type="email" value={parentEmail} placeholder={t('auth.emailHint')} required autoComplete="off" disabled={isLoading} error={fieldErrors.parentEmail} onChange={e => { setParentEmail(e.target.value); clearFieldError('parentEmail') }} />}

                  <TermsCheckbox
                    checked={agreedToTerms}
                    onChange={v => { setAgreedToTerms(v); clearFieldError('agreedToTerms') }}
                    disabled={isLoading}
                    error={fieldErrors.agreedToTerms}
                    errorId="terms-error"
                  />

                  <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('auth.signingUp') : t('auth.signup')}
                  </Button>
                </form>

                <GoogleSignInSection
                  disabled={isLoading}
                  onSuccess={async credential => {
                    setErrorKey(null)
                    resetFieldErrors()
                    if (role === 'parent') {
                      setIsLoading(true)
                      try {
                        const tokens = await loginWithGoogle(credential)
                        establishParentSession(tokens, navigate)
                      } catch (err) {
                        setErrorKey(getApiErrorKey(err))
                      } finally {
                        setIsLoading(false)
                      }
                    } else {
                      setKidGoogleToken(credential)
                    }
                  }}
                  onError={() => { resetFieldErrors(); setErrorKey('errors.api.invalidGoogleToken') }}
                />
              </>
            )}

            <div className="flex flex-col items-center gap-3 pt-1">
              <p className="font-body text-sm text-gray-500 text-center">
                {t('auth.hasAccount')}{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded-sm"
                  aria-label={t('a11y.goToLogin')}
                >
                  {t('nav.login')}
                </Link>
              </p>
              <LegalLinks />
            </div>

    </AuthCard>
  )
}
