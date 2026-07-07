import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TodaysTasks from '../components/kid/TodaysTasks'
import KidStats from '../components/kid/KidStats'
import WelcomeModal from '../components/kid/WelcomeModal'
import { useKidLevel } from '../hooks/useKidLevel'
import { usePageTitle } from '../hooks/usePageTitle'
import useAuthStore from '../store/authStore'

const WELCOME_KEY = (userId: string) => `kp_welcome_${userId}`

export default function ChildDashboard() {
  const { t } = useTranslation()
  const { level, progress, xpCurrent, xpMax, isLoading: levelLoading } = useKidLevel()
  const userId = useAuthStore(s => s.currentUser?.id ?? '')
  usePageTitle(t('app.name'))

  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => !!localStorage.getItem(WELCOME_KEY(userId))
  )

  function dismissWelcome() {
    localStorage.setItem(WELCOME_KEY(userId), '1')
    setWelcomeDismissed(true)
  }

  return (
    <main
      id="main-content"
      aria-labelledby="dashboard-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="dashboard-heading" className="sr-only">{t('kidDash.dashboardMain')}</h1>

      {/* Hero level card */}
      <div
        className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-6"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-8 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            {levelLoading ? (
              <div className="mb-3 h-7 w-24 rounded-full bg-white/20 animate-pulse" />
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 mb-3">
                <span aria-hidden="true">⭐</span>
                <span className="font-heading font-bold text-white text-sm">
                  {t('kidDash.level', { level })}
                </span>
              </div>
            )}
            <p className="font-body text-sm text-white mb-4">
              {t('kidDash.motivationHint')}
            </p>
            <div className="w-64 max-w-full">
              <div
                role="progressbar"
                aria-label={t('kidDash.xpProgressLabel', { next: level + 1 })}
                aria-valuenow={levelLoading ? undefined : xpCurrent}
                aria-valuemin={0}
                aria-valuemax={xpMax}
                className="h-3 bg-white/20 rounded-full overflow-hidden"
              >
                {!levelLoading && (
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
              {levelLoading ? (
                <div className="mt-1.5 h-3 w-20 rounded-full bg-white/20 animate-pulse" />
              ) : (
                <p className="font-body text-xs text-white mt-1.5">{xpCurrent} / {xpMax} XP</p>
              )}
            </div>
          </div>
          <span className="text-5xl sm:text-7xl shrink-0" aria-hidden="true">🏆</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1">
        <div className="lg:col-span-2">
          <TodaysTasks />
        </div>
        <div className="lg:col-span-1">
          <KidStats />
        </div>
      </div>

      {!welcomeDismissed && (
        <WelcomeModal onDismiss={dismissWelcome} />
      )}
    </main>
  )
}
