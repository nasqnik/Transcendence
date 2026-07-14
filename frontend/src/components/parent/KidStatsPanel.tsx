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
        {t('parentDash.allCategories')}
      </h2>

      {isLoading ? (
        <div className="py-6 text-center">
          <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {CATEGORIES.map(category => {
            const stat  = stats.find(s => s.category === category)
            const level = stat?.level ?? 1
            const pct   = stat?.xp_percent ?? 0
            const style = CATEGORY_STYLE[category]

            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{style.icon}</span>
                    <span className="font-body text-sm font-semibold text-gray-700">
                      {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                    </span>
                  </div>
                  <span className={`w-16 text-center py-0.5 rounded-full ${style.bg} ${style.text} font-body font-bold text-xs`}>
                    {t('parentDash.level', { level })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 bg-gray-100 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full ${style.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
