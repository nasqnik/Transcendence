import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TodaysTasks from '../components/kid/TodaysTasks'
import KidStats from '../components/kid/KidStats'
import KidProgressBand from '../components/kid/KidProgressBand'
import WelcomeModal from '../components/kid/WelcomeModal'
import { usePageTitle } from '../hooks/usePageTitle'
import useAuthStore from '../store/authStore'

const WELCOME_KEY = (userId: string) => `kp_welcome_${userId}`

export default function ChildDashboard() {
  const { t } = useTranslation()
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
      className="flex-1 w-full flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="dashboard-heading" className="sr-only">{t('kidDash.dashboardMain')}</h1>

      <KidProgressBand />

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
