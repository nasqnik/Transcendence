import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { kidsFromToken, getKidStats, type KidRef } from '../api/parent'
import { usePageTitle } from '../hooks/usePageTitle'
import KidCard from '../components/parent/KidCard'
import KidSwitcher from '../components/parent/KidSwitcher'
import KidInsights from '../components/parent/KidInsights'

export default function ParentDashboard() {
  const { t } = useTranslation()
  usePageTitle(t('parentDash.title'))

  const { token } = useAuthStore()
  const kids = token ? kidsFromToken(token) : []

  const [selectedKidId, setSelectedKidId] = useState<string | null>(kids[0]?.id ?? null)
  // Fall back to the first kid if the stored selection is missing/stale.
  const kidId =
    selectedKidId && kids.some(k => k.id === selectedKidId)
      ? selectedKidId
      : kids[0]?.id ?? null

  // Name when the backend provides it; otherwise "Child N" (multiple) or
  // "Your child" (single) so kids stay distinguishable in the switcher.
  const labelFor = (kid: KidRef, index: number) =>
    kid.username || (kids.length > 1 ? t('parentDash.childN', { n: index + 1 }) : t('parentDash.yourChild'))

  const selectedIndex = kids.findIndex(k => k.id === kidId)
  const selectedLabel = selectedIndex >= 0 ? labelFor(kids[selectedIndex], selectedIndex) : undefined

  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['kidStats', kidId],
    queryFn: () => getKidStats(kidId!),
    enabled: kidId !== null,
  })

  if (!kidId) {
    return (
      <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="text-center flex flex-col items-center gap-3">
          <span className="text-5xl" aria-hidden="true">👤</span>
          <p className="font-body text-gray-500">{t('parentDash.noKid')}</p>
        </div>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      aria-labelledby="dashboard-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      {/* Hidden heading for a11y — visible heading is in ParentTopbar */}
      <h1 id="dashboard-heading" className="sr-only">
        {t('parentDash.title')}
      </h1>

      {kids.length > 1 && (
        <KidSwitcher kids={kids} selectedId={kidId} onSelect={setSelectedKidId} labelFor={labelFor} />
      )}

      <KidCard kidName={selectedLabel} />

      <KidInsights kidId={kidId} stats={stats} statsLoading={statsLoading} />
    </main>
  )
}
