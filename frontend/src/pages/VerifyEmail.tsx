import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from '../components/AuthMessageLayout'
import Button from '../components/Button'
import { verifyParentEmail } from '../api/auth'
import { acceptInvitePath, getPendingInviteToken } from '../utils/inviteToken'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTokenVerification, ALREADY_VERIFIED_KEYS } from '../hooks/useTokenVerification'

export default function VerifyEmail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(t('verify.title'))
  const { state, errorMessageKey } = useTokenVerification(
    'verify-heading', verifyParentEmail, ALREADY_VERIFIED_KEYS,
  )

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
