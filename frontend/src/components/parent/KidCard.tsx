import { useTranslation } from 'react-i18next'
import type { KidStat } from '../../constants/categories'

interface KidCardProps {
  kidId: string
  stats: KidStat[]
  isLoading: boolean
}

export default function KidCard({ kidId, stats, isLoading }: KidCardProps) {
  const { t } = useTranslation()
  const mainLevel = stats.length ? Math.max(...stats.map(s => s.level)) : 1
  const tracked   = stats.length

  return (
    <div className="bg-white rounded-2xl p-6 flex items-center gap-5">
      <div
        className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-3xl shrink-0"
        aria-hidden="true"
      >
        👦
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-gray-400 mb-1 truncate font-mono">
          ID: {kidId.slice(0, 8)}…
        </p>
        {isLoading ? (
          <p className="font-body text-sm text-gray-400">{t('tasks.loading')}</p>
        ) : (
          <div className="flex items-end gap-6">
            <div>
              <p className="font-heading font-bold text-3xl text-gray-900">
                {t('parentDash.level', { level: mainLevel })}
              </p>
            </div>
            <div>
              <p className="font-heading font-bold text-xl text-gray-700">{tracked} / 4</p>
              <p className="font-body text-xs text-gray-400">
                {t('parentDash.allCategories').toLowerCase()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
