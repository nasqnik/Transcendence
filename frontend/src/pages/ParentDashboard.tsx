import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { kidIdsFromToken, getKidStats } from '../api/parent'
import { usePageTitle } from '../hooks/usePageTitle'
import KidCard from '../components/parent/KidCard'
import KidStatsPanel from '../components/parent/KidStatsPanel'
import PendingApprovals from '../components/parent/PendingApprovals'

export default function ParentDashboard() {
  const { t } = useTranslation()
  usePageTitle(t('parentDash.title'))

  const { token } = useAuthStore()
  const kidIds = token ? kidIdsFromToken(token) : []
  const kidId  = kidIds[0] ?? null

  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['kidStats', kidId],
    queryFn: () => getKidStats(kidId!),
    enabled: kidId !== null,
  })

  if (!kidId) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center flex flex-col items-center gap-3">
          <span className="text-5xl" aria-hidden="true">👤</span>
          <p className="font-body text-gray-500">{t('parentDash.noKid')}</p>
        </div>
      </main>
    )
  }

  return (
    <main
      aria-labelledby="dashboard-heading"
      className="flex-1 p-8 flex flex-col gap-6 overflow-auto"
    >
      {/* Hidden heading for a11y — visible heading is in ParentTopbar */}
      <h1 id="dashboard-heading" className="sr-only">
        {t('parentDash.title')}
      </h1>

      <KidCard kidId={kidId} stats={stats} isLoading={statsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <KidStatsPanel stats={stats} isLoading={statsLoading} />
        </div>
        <div className="lg:col-span-2">
          <PendingApprovals />
        </div>
      </div>
    </main>
  )
}
