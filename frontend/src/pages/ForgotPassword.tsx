import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function ForgotPassword() {
  const { t } = useTranslation()

  return (
    <main aria-labelledby="forgot-password-heading" className="flex flex-col items-center justify-center h-screen bg-primary-50 gap-6">
      <h1 id="forgot-password-heading" className="font-heading text-3xl font-bold text-primary-700 text-center">
        {t('auth.forgotPassword')}
      </h1>
      <p className="font-body text-sm text-gray-700 text-center max-w-80">
        {t('auth.forgotPasswordHint')}
      </p>
      <Link
        to="/login"
        className="font-semibold text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
      >
        {t('nav.login')}
      </Link>
      <LanguageSwitcher />
    </main>
  )
}
