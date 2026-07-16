import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import { useKidLevel } from '../../hooks/useKidLevel'
import KidUserMenu from './KidUserMenu'
import NotificationBell from '../NotificationBell'

export default function KidTopbar() {
  const { t } = useTranslation()
  const { currentUser } = useAuthStore()
  const { streak, coins } = useKidLevel()

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-heading text-xl sm:text-2xl font-bold text-gray-900 truncate">
          {t('dashboard.greeting', { name: currentUser?.username })}{' '}
          <span aria-hidden="true">👋</span>
        </p>
        <p className="hidden sm:block font-body text-sm text-gray-400">{t('kidDash.readyToLevel')}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {streak > 0 && (
          <div
            aria-label={t('kidDash.streakLabel', { count: streak })}
            className="flex items-center gap-1.5 sm:gap-2.5 bg-amber-50 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5"
          >
            <span className="text-lg sm:text-xl" aria-hidden="true">🔥</span>
            <div aria-hidden="true">
              <p className="font-heading font-bold text-gray-900 text-sm sm:text-base leading-none">{streak}</p>
              <p className="hidden sm:block font-body text-xs text-gray-400 leading-none mt-0.5">{t('kidDash.streak')}</p>
            </div>
          </div>
        )}

        {coins > 0 && (
          <div className="hidden sm:flex items-center gap-2.5 bg-amber-50 rounded-2xl px-4 py-2.5">
            <span className="text-xl" aria-hidden="true">🪙</span>
            <div>
              <p className="font-heading font-bold text-gray-900 text-base leading-none">{coins}</p>
              <p className="font-body text-xs text-gray-400 leading-none mt-0.5">{t('kidDash.coins')}</p>
            </div>
          </div>
        )}

        <NotificationBell />
        <KidUserMenu />
      </div>
    </header>
  )
}
