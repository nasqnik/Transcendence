import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import KidSidebar from './KidSidebar'
import KidTopbar from './KidTopbar'
import KidBottomNav from './KidBottomNav'
import LegalLinks from '../LegalLinks'
import RewardModal from './RewardModal'
import { useRewards } from '../../hooks/useRewards'
import { usePresence } from '../../hooks/usePresence'

export default function KidLayout() {
  const { t } = useTranslation()
  const { current: reward, remaining, dismiss } = useRewards()
  // mounted here, not on the Friends page, so a kid stays online on every page
  usePresence(true)

  return (
    <div className="flex min-h-screen bg-primary-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[60] focus:bg-white focus:text-primary-700 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus-ring"
      >
        {t('a11y.skipToContent')}
      </a>
      <KidSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <KidTopbar />
        <Outlet />
        <footer className="border-t border-gray-200 bg-white px-4 sm:px-8 py-3 pb-20 lg:pb-3 flex justify-center sm:justify-end shrink-0">
          <LegalLinks />
        </footer>
      </div>
      <KidBottomNav />

      {/* Here rather than inside the dashboard: coins are earned by completing
          a task, which happens on the tasks page, and the catch-up feed can
          deliver an award earned overnight whichever page the kid opens. */}
      {reward && (
        <RewardModal
          key={reward.completion_id}
          reward={reward}
          remaining={remaining}
          onClose={() => dismiss(reward.completion_id)}
        />
      )}
    </div>
  )
}
