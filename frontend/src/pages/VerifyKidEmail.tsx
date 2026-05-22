import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { verifyKidEmail } from '../api/auth'
import { parseApiError } from '../api/errors'

type PageState = 'loading' | 'success' | 'error'

export default function VerifyKidEmail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setErrorMessage(t('verify.invalidLink'))
      setState('error')
      return
    }

    verifyKidEmail(token)
      .then(() => setState('success'))
      .catch(err => {
        setErrorMessage(parseApiError(err))
        setState('error')
      })
  }, [])

  return (
    <main aria-labelledby="verify-heading" className="flex flex-col items-center justify-center min-h-screen bg-primary-50 gap-6 py-12">

      {state === 'loading' && (
        <p className="font-body text-gray-600">{t('verify.loading')}</p>
      )}

      {state === 'success' && (
        <>
          <div className="text-5xl" aria-hidden="true">✅</div>
          <h1 id="verify-heading" className="font-heading text-3xl font-bold text-primary-700 text-center">
            {t('verify.successTitle')}
          </h1>
          <p className="font-body text-sm text-gray-700 text-center w-80 max-w-full">
            {t('verify.kidSuccessHint')}
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            {t('auth.backToHome')}
          </Button>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="text-5xl" aria-hidden="true">❌</div>
          <h1 id="verify-heading" className="font-heading text-2xl font-bold text-primary-700 text-center">
            {errorMessage}
          </h1>
          <Button variant="secondary" onClick={() => navigate('/')}>
            {t('auth.backToHome')}
          </Button>
        </>
      )}

      <LanguageSwitcher />
    </main>
  )
}
