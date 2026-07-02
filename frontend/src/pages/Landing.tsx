import Button from '../components/Button'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Landing() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle(t('app.name'))

  return (
    <main aria-labelledby="landing-heading" className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4 py-8 gap-4">
      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="bg-white rounded-2xl overflow-hidden">

          {/* Gradient hero header */}
          <div className="relative bg-gradient-to-br from-primary-600 to-primary-500 px-6 py-10 overflow-hidden text-center">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
            <div className="absolute top-1/2 right-1/4 w-12 h-12 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="text-5xl" aria-hidden="true">⭐</span>
              <h1 id="landing-heading" className="font-heading text-3xl font-bold text-white">
                {t('app.name')}
              </h1>
              <p className="font-body text-white/80 text-sm leading-relaxed max-w-xs">
                {t('landing.tagline')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-6 flex flex-col gap-4">
            <nav aria-label={t('a11y.mainNav')} className="flex flex-col gap-3">
              <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/signup')}>
                {t('nav.signup')}
              </Button>
            </nav>

            <nav aria-label={t('a11y.legalNav')} className="flex justify-center gap-4 pt-1">
              <Link to="/privacy" className="font-body text-xs text-gray-500 hover:text-primary-600 focus-ring rounded-sm">
                {t('legal.privacy')}
              </Link>
              <Link to="/terms" className="font-body text-xs text-gray-500 hover:text-primary-600 focus-ring rounded-sm">
                {t('legal.terms')}
              </Link>
            </nav>
          </div>

        </div>

        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </main>
  )
}
