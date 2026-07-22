import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import AuthCard from '../components/AuthCard'
import GoogleSignInSection from '../components/GoogleSignInSection'
import LegalLinks from '../components/LegalLinks'
import Button from '../components/Button'
import FormAlert from '../components/FormAlert'
import FormField from '../components/FormField'
import TermsCheckbox from '../components/TermsCheckbox'
import SignupParentPending from '../components/SignupParentPending'
import SignupKidPending from '../components/SignupKidPending'
import SignupKidGoogleProfile from '../components/SignupKidGoogleProfile'
import { establishParentSession } from '../auth/session'
import { registerParent, loginWithGoogle, signupKid, type KidSignupResponse } from '../api/auth'
import { getApiErrorKey, getFieldErrors } from '../api/errors'
import { useFormErrors } from '../hooks/useFormErrors'
import { usePageTitle } from '../hooks/usePageTitle'
import { isEmpty, isValidEmail, validatePasswordField } from '../utils/validation'

export default function Signup() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle(`${t('auth.signup')} — ${t('app.name')}`)

  const [role, setRole]               = useState<'parent' | 'kid' | null>(null)
  const [username, setUsername]       = useState('')
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [errorKey, setErrorKey]       = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  const [parentPendingEmail, setParentPendingEmail] = useState<string | null>(null)
  const [kidPending, setKidPending]                 = useState<KidSignupResponse | null>(null)
  const [kidGoogleToken, setKidGoogleToken]         = useState<string | null>(null)

  useEffect(() => {
    if (role !== null) document.getElementById('username')?.focus()
  }, [role])

  function selectRole(next: 'parent' | 'kid') {
    setRole(next)
    setErrorKey(null)
    resetFieldErrors()
    setUsername('')
    setName('')
    setEmail('')
    setPassword('')
    setParentEmail('')
    setAgreedToTerms(false)
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (isEmpty(username)) errs.username = t('errors.required')
    if (role === 'kid' && isEmpty(name)) errs.name = t('errors.required')
    if (isEmpty(email)) errs.email = t('errors.required')
    else if (!isValidEmail(email)) errs.email = t('errors.invalidEmail')
    const passwordError = validatePasswordField(password, t, { username, email })
    if (passwordError) errs.password = passwordError
    if (role === 'kid') {
      if (isEmpty(parentEmail)) errs.parentEmail = t('errors.required')
      else if (!isValidEmail(parentEmail)) errs.parentEmail = t('errors.invalidEmail')
    }
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
        const result = await signupKid(name, username, email, password, parentEmail)
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

  if (parentPendingEmail) return <SignupParentPending email={parentPendingEmail} />
  if (kidPending) return <SignupKidPending kidPending={kidPending} parentEmail={parentEmail} />
  if (kidGoogleToken) {
    return (
      <SignupKidGoogleProfile
        googleToken={kidGoogleToken}
        onSuccess={(result, pe) => { setKidPending(result); setParentEmail(pe) }}
        onBack={() => { setKidGoogleToken(null); setErrorKey(null); resetFieldErrors() }}
      />
    )
  }

  const headerIcon = role === 'parent' ? '👨‍👩‍👧' : role === 'kid' ? '🧒' : '✨'

  return (
    <AuthCard headingId="signup-heading" title={t('auth.signup')} icon={headerIcon}>

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

      <p className="sr-only" aria-live="polite" role="status">
        {role !== null ? t('a11y.signupFormReady') : ''}
      </p>

      {role !== null && (
        <>
          <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit} aria-labelledby="signup-heading" aria-busy={isLoading}>
            {errorKey && <FormAlert message={t(errorKey)} />}

            <FormField id="username" label={t('auth.username')} type="text" dir="ltr" value={username} required autoComplete="username" disabled={isLoading} error={fieldErrors.username} onChange={e => { setUsername(e.target.value); clearFieldError('username') }} />

            {role === 'kid' && <FormField id="name" label={t('auth.name')} type="text" value={name} required autoComplete="name" disabled={isLoading} error={fieldErrors.name} onChange={e => { setName(e.target.value); clearFieldError('name') }} />}

            <FormField id="email" label={t('auth.email')} type="email" value={email} placeholder={t('auth.emailHint')} required autoComplete="email" disabled={isLoading} error={fieldErrors.email} onChange={e => { setEmail(e.target.value); clearFieldError('email') }} />

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
