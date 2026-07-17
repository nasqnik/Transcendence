import { useTranslation } from 'react-i18next'
import { type TaskCategory, CATEGORY_STYLE, type KidStat } from '../../constants/categories'

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']

interface KidStatsPanelProps {
  stats: KidStat[]
  isLoading: boolean
}

export default function KidStatsPanel({ stats, isLoading }: KidStatsPanelProps) {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="kid-stats-heading" className="bg-white rounded-2xl p-5">
      <h2 id="kid-stats-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
        {t('parentDash.subjectFocus')}
      </h2>

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
          const style = CATEGORY_STYLE[category]
          const stat  = stats.find(s => s.category === category)
          const level = stat?.level ?? 0
          const pct   = stat?.xp_percent ?? 0

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
                  {t('parentDash.level', { level })}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-3 bg-gray-100 rounded-full overflow-hidden ms-10"
              >
                <div
                  className={`h-full ${style.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="font-body text-xs text-gray-400 ms-10 mt-1">{pct} / 100</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
