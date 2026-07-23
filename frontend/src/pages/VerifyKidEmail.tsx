import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import Button from '../components/Button'
import { verifyKidEmail } from '../api/auth'
import { getApiErrorKey } from '../api/errors'
import { usePageTitle } from '../hooks/usePageTitle'
import useAuthStore from '../store/authStore'
import { PARENT_DASHBOARD_PATH } from '../auth/session'

type PageState = 'loading' | 'success' | 'active' | 'error'

export default function VerifyKidEmail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(`${t('verify.title')} — ${t('app.name')}`)
  const { isAuthenticated, currentUser, logout } = useAuthStore()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const parentLoggedIn = isAuthenticated && currentUser?.role === 'parent'
  const [state, setState] = useState<PageState>(() => token ? 'loading' : 'error')
  const [errorMessageKey, setErrorMessageKey] = useState(() => token ? '' : 'verify.invalidLink')

  useEffect(() => {
    if (state !== 'loading') document.getElementById('verify-heading')?.focus()
  }, [state])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    verifyKidEmail(token)
      .then(data => {
        if (cancelled) return
        if (data?.registration_status === 'active') {
          setState('active')
        } else {
          setState('success')
        }
      })
      .catch(err => {
        if (cancelled) return
        const key = getApiErrorKey(err)
        // An invalid/used token almost always means the email was already
        // verified on an earlier visit — show success rather than an error.
        if (key === 'errors.api.alreadyVerified' || key === 'errors.api.invalidVerificationToken') {
          setState('success')
          return
        }
        setErrorMessageKey(key)
        setState('error')
      })

    return () => {
      cancelled = true
    }
  // Deps intentionally limited to `token` — language changes must not re-trigger verification.
  }, [token])

  if (state === 'loading') {
    return (
      <AuthMessageLayout
        headingId="verify-heading"
        title={t('verify.loading')}
        statusMessage={t('verify.loading')}
      />
    )
  }

  function kidVerifyActions(loginPrimary: boolean) {
    if (parentLoggedIn) {
      return (
        <>
          <p className="font-body text-sm text-gray-700 text-center w-full">
            {t('verify.kidVerifiedParentSession')}
          </p>
          <Button variant="primary" onClick={() => { logout(); navigate('/login') }}>
            {t('nav.logout')}
          </Button>
          <Button variant="secondary" onClick={() => navigate(PARENT_DASHBOARD_PATH)}>
            {t('invite.goToDashboard')}
          </Button>
        </>
      )
    }
    return (
      <>
        <p className="font-body text-sm text-gray-700 text-center w-full">
          {state === 'active' ? t('verify.allSetHint') : t('verify.kidSuccessHint')}
        </p>
        <Button variant="primary" onClick={() => navigate(loginPrimary ? '/login' : '/')}>
          {loginPrimary ? t('auth.login') : t('auth.backToHome')}
        </Button>
      </>
    )
  }

  if (state === 'success') {
    return (
      <AuthMessageLayout
        headingId="verify-heading"
        icon="✅"
        title={t('verify.successTitle')}
        statusMessage={t('verify.successTitle')}
      >
        {kidVerifyActions(false)}
      </AuthMessageLayout>
    )
  }

  if (state === 'active') {
    return (
      <AuthMessageLayout
        headingId="verify-heading"
        icon="🎉"
        title={t('verify.allSetTitle')}
        statusMessage={t('verify.allSetTitle')}
      >
        {kidVerifyActions(true)}
      </AuthMessageLayout>
    )
  }

  return (
    <AuthMessageLayout
      headingId="verify-heading"
      icon="❌"
      title={t('verify.errorTitle')}
      alertMessage={t(errorMessageKey)}
      statusMessage={t(errorMessageKey)}
    >
      <Button variant="primary" onClick={() => navigate(parentLoggedIn ? PARENT_DASHBOARD_PATH : '/')}>
        {parentLoggedIn ? t('invite.goToDashboard') : t('auth.backToHome')}
      </Button>
    </AuthMessageLayout>
  )
}
