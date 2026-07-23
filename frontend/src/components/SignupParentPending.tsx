import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from './AuthMessageLayout'
import Button from './Button'

interface Props {
  email: string
}

export default function SignupParentPending({ email }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => { document.getElementById('verify-heading')?.focus() }, [])

  return (
    <AuthMessageLayout
      headingId="verify-heading"
      icon="📬"
      title={t('auth.verifyYourEmail')}
      statusMessage={t('auth.verifyYourEmail')}
    >
      <p className="font-body text-sm text-gray-500 text-center w-full">
        {t('auth.verifyEmailHint', { email })}
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
