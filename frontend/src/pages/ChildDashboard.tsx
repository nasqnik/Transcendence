import { useTranslation } from 'react-i18next'
import TodaysTasks from '../components/kid/TodaysTasks'
import KidStats from '../components/kid/KidStats'
import { usePageTitle } from '../hooks/usePageTitle'

export default function ChildDashboard() {
  const { t } = useTranslation()
  usePageTitle(t('app.name'))

  return (
    <main
      id="main-content"
      aria-labelledby="dashboard-heading"
      className="flex-1 p-6 grid grid-cols-3 gap-6 overflow-auto"
    >
      <h1 id="dashboard-heading" className="sr-only">{t('kidDash.dashboardMain')}</h1>
      <div className="col-span-2">
        <TodaysTasks />
      </div>
      <div className="col-span-1">
        <KidStats />
      </div>
    </main>
  )
}
