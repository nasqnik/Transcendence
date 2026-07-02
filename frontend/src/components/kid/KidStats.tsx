import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type TaskCategory, CATEGORY_STYLE } from '../../constants/categories'
import { useKidLevel } from '../../hooks/useKidLevel'
import StatsLog from './StatsLog'
import LevelUpModal from './LevelUpModal'

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']

export default function KidStats() {
  const { t } = useTranslation()
  const [logOpen, setLogOpen] = useState(false)
  const [levelUp, setLevelUp] = useState<{ category: TaskCategory; level: number } | null>(null)

  const { stats, pendingXpByCategory, isLoading } = useKidLevel()

  // Detect level-ups by comparing category levels before and after each refetch
  const prevLevelsRef = useRef<Record<TaskCategory, number> | null>(null)

  useEffect(() => {
    if (isLoading) return
    const currentLevels = Object.fromEntries(
      CATEGORIES.map(cat => [cat, stats[cat].level])
    ) as Record<TaskCategory, number>

    if (prevLevelsRef.current) {
      for (const cat of CATEGORIES) {
        if (currentLevels[cat] > prevLevelsRef.current[cat]) {
          setLevelUp({ category: cat, level: currentLevels[cat] })
          break
        }
      }
    }

    prevLevelsRef.current = currentLevels
  }, [stats, isLoading])

  return (
    <>
      <section aria-labelledby="stats-heading" className="bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="stats-heading" className="font-heading text-lg font-bold text-gray-900">
            {t('kidDash.myStats')}
          </h2>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={logOpen}
            className="font-body text-xs font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
            onClick={() => setLogOpen(true)}
          >
            {t('kidDash.details')}
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {isLoading ? CATEGORIES.map(cat => (
            <div key={cat} className="animate-pulse">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl bg-gray-100 shrink-0" />
                <div className="h-3.5 w-20 rounded-full bg-gray-100 flex-1" />
                <div className="h-3 w-12 rounded-full bg-gray-100" />
              </div>
              <div className="h-3 rounded-full bg-gray-100 ms-10" />
            </div>
          )) : CATEGORIES.map(category => {
            const style      = CATEGORY_STYLE[category]
            const { level, xp_percent } = stats[category]
            const pending = pendingXpByCategory[category] ?? 0
            const pendingWidth = Math.min(pending, 100 - xp_percent)

            return (
              <div key={category}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl ${style.bg} flex items-center justify-center text-sm shrink-0`}
                    aria-hidden="true"
                  >
                    {style.icon}
                  </div>
                  <span className="font-body text-sm font-semibold text-gray-700 flex-1">
                    {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                  </span>
                  <span className={`font-body text-xs font-bold ${style.text}`}>
                    {t('kidDash.level', { level })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                  aria-valuenow={xp_percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="relative h-3 bg-gray-100 rounded-full overflow-hidden ms-10"
                >
                  <div
                    className={`absolute inset-y-0 left-0 ${style.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${xp_percent}%` }}
                  />
                  {pendingWidth > 0 && (
                    <div
                      className={`absolute inset-y-0 ${style.bar} opacity-35 rounded-full transition-all duration-500`}
                      style={{ left: `${xp_percent}%`, width: `${pendingWidth}%` }}
                    />
                  )}
                </div>
                <div className="ms-10 mt-1 flex items-center justify-between">
                  <span className="font-body text-xs text-gray-400">{xp_percent} / 100</span>
                  {pending > 0 && (
                    <span className="font-body text-xs font-semibold text-amber-700">
                      +{pending} <span aria-hidden="true">⏳</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {logOpen && <StatsLog onClose={() => setLogOpen(false)} />}

      {levelUp && (
        <LevelUpModal
          category={levelUp.category}
          level={levelUp.level}
          onClose={() => setLevelUp(null)}
        />
      )}
    </>
  )
}
