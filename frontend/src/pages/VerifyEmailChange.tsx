import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import Button from '../components/Button'
import { verifyEmailChange } from '../api/account'
import { getApiErrorKey } from '../api/errors'
import { usePageTitle } from '../hooks/usePageTitle'

type PageState = 'loading' | 'success' | 'error'

export default function VerifyEmailChange() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(`${t('parentDash.emailChangeSuccess')} — ${t('app.name')}`)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<PageState>(() => (token ? 'loading' : 'error'))
  const [errorMessageKey, setErrorMessageKey] = useState(() => (token ? '' : 'verify.invalidLink'))

  useEffect(() => {
    if (state !== 'loading') document.getElementById('email-change-heading')?.focus()
  }, [state])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    verifyEmailChange(token)
      .then(() => { if (!cancelled) setState('success') })
      .catch(err => {
        if (cancelled) return
        setErrorMessageKey(getApiErrorKey(err))
        setState('error')
      })

    return () => { cancelled = true }
  // Only re-run on token change — language switches must not re-trigger.
  }, [token])

  if (state === 'loading') {
    return (
      <AuthMessageLayout
        headingId="email-change-heading"
        title={t('parentDash.emailChangeVerifying')}
        statusMessage={t('parentDash.emailChangeVerifying')}
      />
    )
  }

  if (state === 'success') {
    return (
      <AuthMessageLayout
        headingId="email-change-heading"
        icon="✅"
        title={t('parentDash.emailChangeSuccess')}
        statusMessage={t('parentDash.emailChangeSuccess')}
      >
        <p className="font-body text-sm text-gray-700 text-center w-full">
          {t('parentDash.emailChangeSuccessHint')}
        </p>
        <Button variant="primary" onClick={() => navigate('/login')}>
          {t('auth.login')}
        </Button>
      </AuthMessageLayout>
    )
  }

  return (
    <AuthMessageLayout
      headingId="email-change-heading"
      icon="❌"
      title={t('verify.errorTitle')}
      alertMessage={t(errorMessageKey)}
      statusMessage={t(errorMessageKey)}
    >
      <Button variant="primary" onClick={() => navigate('/')}>
        {t('auth.backToHome')}
      </Button>
    </AuthMessageLayout>
  )
}
