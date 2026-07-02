import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import TodaysTasks from '../components/kid/TodaysTasks'
import KidStats from '../components/kid/KidStats'
import { useKidLevel } from '../hooks/useKidLevel'
import { usePageTitle } from '../hooks/usePageTitle'
import { getTasks } from '../api/tasks'

export default function ChildDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { level, progress, xpCurrent, xpMax, isLoading: levelLoading } = useKidLevel()
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  usePageTitle(t('app.name'))

  const showWelcome = !tasksLoading && tasks.length === 0

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

      {showWelcome ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="text-6xl mb-4" aria-hidden="true">🌟</div>
            <h2 className="font-heading text-xl font-bold text-gray-900 mb-2">
              {t('kidDash.welcomeTitle')}
            </h2>
            <p className="font-body text-sm text-gray-400 mb-6 leading-relaxed">
              {t('kidDash.welcomeHint')}
            </p>
            <div className="flex justify-center items-center gap-3 mb-6" aria-hidden="true">
              <span className="text-2xl">📋</span>
              <span className="text-gray-300 font-bold">→</span>
              <span className="text-2xl">⭐</span>
              <span className="text-gray-300 font-bold">→</span>
              <span className="text-2xl">🏆</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 focus-ring transition-colors"
            >
              {t('kidDash.inviteNow')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1">
          <div className="lg:col-span-2">
            <TodaysTasks />
          </div>
          <div className="lg:col-span-1">
            <KidStats />
          </div>
        </div>
      )}
    </main>
  )
}
