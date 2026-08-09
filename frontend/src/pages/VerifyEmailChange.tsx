import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import Button from '../components/Button'
import { verifyEmailChange } from '../api/account'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTokenVerification } from '../hooks/useTokenVerification'
import useAuthStore from '../store/authStore'

export default function VerifyEmailChange() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  usePageTitle(`${t('parentDash.emailChangeSuccess')} — ${t('app.name')}`)
  const { state, errorMessageKey } = useTokenVerification('email-change-heading', verifyEmailChange)

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
        {/* Sign out first. The address on the account just changed, so the
            session in the store is stale — and /login sits behind GuestRoute,
            which would bounce a still-authenticated visitor straight to their
            dashboard, skipping the re-login this button promises. */}
        <Button variant="primary" onClick={() => { logout(); navigate('/login') }}>
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
