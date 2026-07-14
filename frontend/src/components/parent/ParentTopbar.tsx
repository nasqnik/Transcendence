import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import LanguageSwitcher from '../LanguageSwitcher'
import Button from '../Button'

export default function ParentTopbar() {
  const { t } = useTranslation()
  const { currentUser, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 id="dashboard-heading" className="font-heading text-2xl font-bold text-gray-900">
          {t('dashboard.greeting', { name: currentUser?.username })} 👋
        </h1>
        <p className="font-body text-sm text-gray-400">{t('parentDash.title')}</p>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <Button variant="secondary" onClick={handleLogout} className="py-2 px-4 text-sm">
          {t('nav.logout')}
        </Button>
      </div>
    </header>
  )
}
