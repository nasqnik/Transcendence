import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type TaskCategory, CATEGORY_STYLE } from '../../constants/categories'
import { useKidLevel } from '../../hooks/useKidLevel'
import LoadError from '../LoadError'
import StatsLog from './StatsLog'
import LevelUpModal from './LevelUpModal'
import { levelUpsBetween, type LevelUp } from '../../utils/levelUps'

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']

export default function KidStats() {
  const { t } = useTranslation()
  const [logOpen, setLogOpen] = useState(false)
  // A queue, not a single value: finishing one task can raise two categories
  // at once, and `break` after the first meant the kid was congratulated for
  // one and never told about the other.
  const [levelUps, setLevelUps] = useState<LevelUp[]>([])

  const { stats, pendingXpByCategory, isLoading, isError, refetch } = useKidLevel()

  // Detect level-ups by comparing category levels before and after each refetch
  const prevLevelsRef = useRef<Record<TaskCategory, number> | null>(null)

  useEffect(() => {
    if (isLoading) return
    const currentLevels = Object.fromEntries(
      CATEGORIES.map(cat => [cat, stats[cat].level])
    ) as Record<TaskCategory, number>

    if (prevLevelsRef.current) {
      const gained = levelUpsBetween(prevLevelsRef.current, currentLevels)
      if (gained.length > 0) setLevelUps(queue => [...queue, ...gained])
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
            className="min-h-11 -my-2 px-2 flex items-center font-body text-xs font-semibold text-primary-600 hover:text-primary-700 focus-ring rounded"
            onClick={() => setLogOpen(true)}
          >
            {t('kidDash.details')}
          </button>
        </div>

        {isError ? <LoadError onRetry={refetch} /> : (
        <div className="flex flex-col gap-3">
          {isLoading ? CATEGORIES.map(cat => (
            <div key={cat} className="animate-pulse rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="h-3.5 w-20 rounded-full bg-gray-100 flex-1" />
                <div className="h-3 w-12 rounded-full bg-gray-100" />
              </div>
              <div className="h-3 rounded-full bg-gray-100" />
            </div>
          )) : CATEGORIES.map(category => {
            const style      = CATEGORY_STYLE[category]
            const { level, xp_percent } = stats[category]
            const pending = pendingXpByCategory[category] ?? 0
            const pendingWidth = Math.min(pending, 100 - xp_percent)

            return (
              // Each category gets its own tinted card. The colours already
              // existed but only as a thin bar and a small icon, so the panel
              // read as four grey rows — the flattest block on a page meant
              // for a child. The tint is what makes a category recognisable
              // at a glance before the label is even read.
              <div key={category} className={`${style.bg} rounded-2xl p-3`}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-xl shrink-0"
                    aria-hidden="true"
                  >
                    {style.icon}
                  </div>
                  <span className="font-body text-sm font-semibold text-gray-900 flex-1">
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
                  // White track, not gray-100: on a tinted card the grey track
                  // muddies against the tint and the fill loses its edge.
                  className="relative h-3 bg-white rounded-full overflow-hidden"
                >
                  <div
                    className={`absolute inset-y-0 start-0 ${style.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${xp_percent}%` }}
                  />
                  {pendingWidth > 0 && (
                    <div
                      className={`absolute inset-y-0 ${style.bar} opacity-35 rounded-full transition-all duration-500`}
                      style={{ insetInlineStart: `${xp_percent}%`, width: `${pendingWidth}%` }}
                    />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  {/* gray-700, not gray-400: on the amber tint gray-400 lands
                      at 4.59:1, close enough to the 4.5 floor that a nudge to
                      the palette would break it. */}
                  <span className="font-body text-xs text-gray-700">{xp_percent} / 100</span>
                  {/* XP already earned but not yet approved — matches the
                      faded segment on the bar above. Was a bare "+10 ⏳" with
                      nothing saying what it meant. */}
                  {pending > 0 && (
                    <span
                      className="font-body text-xs font-semibold text-amber-700"
                      title={t('kidDash.taskPending')}
                    >
                      <span aria-hidden="true">⏳ +{pending}</span>
                      <span className="sr-only">
                        {t('tasks.xpReward', { xp: pending })} — {t('kidDash.taskPending')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
      </section>

      {logOpen && <StatsLog onClose={() => setLogOpen(false)} />}

      {/* One at a time; closing reveals the next so a double level-up is two
          celebrations rather than one silently dropped. */}
      {levelUps.length > 0 && (
        <LevelUpModal
          key={`${levelUps[0].category}-${levelUps[0].level}`}
          category={levelUps[0].category}
          level={levelUps[0].level}
          onClose={() => setLevelUps(queue => queue.slice(1))}
        />
      )}
    </>
  )
}
