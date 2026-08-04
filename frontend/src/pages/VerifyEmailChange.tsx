import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import Button from '../components/Button'
import { verifyEmailChange } from '../api/account'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTokenVerification } from '../hooks/useTokenVerification'

export default function VerifyEmailChange() {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
