import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from './AuthMessageLayout'
import FormField from './FormField'
import FormAlert from './FormAlert'
import Button from './Button'
import TermsCheckbox from './TermsCheckbox'
import { useFormErrors } from '../hooks/useFormErrors'
import { signupKidWithGoogle, type KidSignupResponse } from '../api/auth'
import { getApiErrorKey, getFieldErrors } from '../api/errors'
import { isEmpty, isValidEmail } from '../utils/validation'

interface Props {
  googleToken: string
  onSuccess: (result: KidSignupResponse, parentEmail: string) => void
  onBack: () => void
}

export default function SignupKidGoogleProfile({ googleToken, onSuccess, onBack }: Props) {
  const { t } = useTranslation()
  const [name, setName]               = useState('')
  const [username, setUsername]       = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [errorKey, setErrorKey]       = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, resetFieldErrors } = useFormErrors()

  useEffect(() => { document.getElementById('google-profile-heading')?.focus() }, [])

  function validate(): Record<string, string> {
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
    setErrorKey(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    resetFieldErrors()
    setIsLoading(true)
    try {
      const result = await signupKidWithGoogle(googleToken, name, username, parentEmail)
      onSuccess(result, parentEmail)
    } catch (err) {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length > 0) { setFieldErrors(fields); return }
      setErrorKey(getApiErrorKey(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthMessageLayout headingId="google-profile-heading" icon="👤" title={t('auth.completeProfile')}>
      <form noValidate className="flex w-full flex-col gap-4" onSubmit={handleSubmit} aria-labelledby="google-profile-heading" aria-busy={isLoading}>
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
        <Button variant="secondary" className="w-full" onClick={onBack}>
          {t('auth.back')}
        </Button>
      </form>
    </AuthMessageLayout>
  )
}
