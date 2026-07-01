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
            className="font-body text-xs font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
            onClick={() => setLogOpen(true)}
          >
            {t('kidDash.details')}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {CATEGORIES.map(category => {
            const style      = CATEGORY_STYLE[category]
            const { level, xp_percent } = stats[category]
            const pending = pendingXpByCategory[category] ?? 0
            const pendingWidth = Math.min(pending, 100 - xp_percent)

            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{style.icon}</span>
                    <span className="font-body text-sm font-semibold text-gray-700">
                      {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-14 text-center py-0.5 rounded-full ${style.bg} ${style.text} font-body font-bold text-xs`}>
                      {t('kidDash.level', { level })}
                    </span>
                    <span className="font-body text-xs text-gray-400">
                      {xp_percent} / 100 XP
                      {pending > 0 && <span className="text-amber-700 ml-1">+{pending} ⏳</span>}
                    </span>
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-label={t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                  aria-valuenow={xp_percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="relative h-2 bg-gray-100 rounded-full overflow-hidden"
                >
                  <div
                    className={`absolute inset-y-0 left-0 ${style.bar} transition-all duration-500`}
                    style={{ width: `${xp_percent}%` }}
                  />
                  {pendingWidth > 0 && (
                    <div
                      className={`absolute inset-y-0 ${style.bar} opacity-35 transition-all duration-500`}
                      style={{ left: `${xp_percent}%`, width: `${pendingWidth}%` }}
                    />
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
