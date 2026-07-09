import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import Button from '../components/Button'
import { verifyParentEmail } from '../api/auth'
import { getApiErrorKey } from '../api/errors'
import { acceptInvitePath, getPendingInviteToken } from '../utils/inviteToken'
import { usePageTitle } from '../hooks/usePageTitle'

type PageState = 'loading' | 'success' | 'error'

export default function VerifyEmail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(`${t('verify.title')} — ${t('app.name')}`)
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<PageState>(() => token ? 'loading' : 'error')
  const [errorMessageKey, setErrorMessageKey] = useState(() => token ? '' : 'verify.invalidLink')

  useEffect(() => {
    if (state !== 'loading') document.getElementById('verify-heading')?.focus()
  }, [state])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    verifyParentEmail(token)
      .then(() => {
        if (!cancelled) setState('success')
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

  if (state === 'success') {
    const pendingInvite = getPendingInviteToken()
    return (
      <AuthMessageLayout
        headingId="verify-heading"
        icon="✅"
        title={t('verify.successTitle')}
        statusMessage={t('verify.successTitle')}
      >
        <p className="font-body text-sm text-gray-700 text-center w-full">
          {pendingInvite
            ? t('verify.parentSuccessReturnInvite')
            : t('verify.parentSuccessHint')}
        </p>
        {pendingInvite ? (
          <Button
            variant="primary"
            onClick={() => navigate(acceptInvitePath(pendingInvite))}
          >
            {t('invite.returnToInvite')}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate('/login')}>
            {t('auth.login')}
          </Button>
        )}
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
      <Button variant="primary" onClick={() => navigate('/')}>
        {t('auth.backToHome')}
      </Button>
    </AuthMessageLayout>
  )
}
