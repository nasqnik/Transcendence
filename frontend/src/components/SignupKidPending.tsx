import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthMessageLayout from './AuthMessageLayout'
import Button from './Button'
import type { KidSignupResponse } from '../api/auth'

interface Props {
  kidPending: KidSignupResponse
  parentEmail: string
}

export default function SignupKidPending({ kidPending, parentEmail }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => { document.getElementById('waiting-heading')?.focus() }, [])

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
          ? t('auth.waitingForParentHint', { email: parentEmail })
          : t('auth.kidStep2', { email: parentEmail })}
      </p>
      <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
        {t('auth.backToHome')}
      </Button>
    </AuthMessageLayout>
  )
}
