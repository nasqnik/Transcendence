import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import KidSidebar from './KidSidebar'
import KidTopbar from './KidTopbar'

export default function KidLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen bg-primary-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-primary-700 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus-ring"
      >
        {t('a11y.skipToContent')}
      </a>
      <KidSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <KidTopbar />
        <Outlet />
      </div>
    </div>
  )
}
