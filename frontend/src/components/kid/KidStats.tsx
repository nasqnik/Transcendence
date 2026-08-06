import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type TaskCategory, CATEGORY_STYLE } from '../../constants/categories'
import { useKidLevel } from '../../hooks/useKidLevel'
import { STAT_XP_PER_LEVEL } from '../../constants/xp'
import LoadError from '../LoadError'
import StatsLog from './StatsLog'
import HowRewardsWork from './HowRewardsWork'

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']

export default function KidStats() {
  const { t } = useTranslation()
  const [logOpen, setLogOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const { stats, pendingXpByCategory, isLoading, isError, refetch } = useKidLevel()


  return (
    <>
      <section aria-labelledby="stats-heading" className="bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="stats-heading" className="font-heading text-lg font-bold text-gray-900">
            {t('kidDash.myStats')}
          </h2>
          <div className="flex items-center gap-1">
            {/* Next to the bars it explains, not buried in settings — the
                question "how do I get coins?" arrives while looking at these. */}
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={helpOpen}
              aria-label={t('rewards.title')}
              className="min-h-11 w-11 -my-2 flex items-center justify-center text-base text-primary-600 hover:text-primary-700 focus-ring rounded"
              onClick={() => setHelpOpen(true)}
            >
              <span aria-hidden="true">💡</span>
            </button>
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
            // xp_percent and pending are both raw XP, so the clamp happens in
            // XP and only the widths are converted to percentages. Comparing
            // one against the other as a percentage mixed the two units.
            const fillPct    = (xp_percent / STAT_XP_PER_LEVEL) * 100
            const pendingXp  = Math.min(pending, STAT_XP_PER_LEVEL - xp_percent)
            const pendingPct = (pendingXp / STAT_XP_PER_LEVEL) * 100

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
                  aria-valuemax={STAT_XP_PER_LEVEL}
                  // White track, not gray-100: on a tinted card the grey track
                  // muddies against the tint and the fill loses its edge.
                  className="relative h-3 bg-white rounded-full overflow-hidden"
                >
                  <div
                    className={`absolute inset-y-0 start-0 ${style.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${fillPct}%` }}
                  />
                  {pendingPct > 0 && (
                    <div
                      className={`absolute inset-y-0 ${style.bar} opacity-35 rounded-full transition-all duration-500`}
                      style={{ insetInlineStart: `${fillPct}%`, width: `${pendingPct}%` }}
                    />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  {/* gray-700, not gray-400: on the amber tint gray-400 lands
                      at 4.59:1, close enough to the 4.5 floor that a nudge to
                      the palette would break it. */}
                  <span className="font-body text-xs text-gray-700">{xp_percent} / {STAT_XP_PER_LEVEL}</span>
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

      {helpOpen && <HowRewardsWork onClose={() => setHelpOpen(false)} />}

    </>
  )
}
