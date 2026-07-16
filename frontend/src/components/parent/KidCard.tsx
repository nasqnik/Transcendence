import { useTranslation } from 'react-i18next'
import type { KidStat } from '../../constants/categories'

interface KidCardProps {
  kidName?: string
  stats: KidStat[]
  isLoading: boolean
}

export default function KidCard({ kidName, stats, isLoading }: KidCardProps) {
  const { t } = useTranslation()
  const mainLevel = stats.length ? Math.max(...stats.map(s => s.level)) : 0
  const tracked   = stats.length
  const displayName = kidName || t('parentDash.yourChild')

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 sm:p-6">
      <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-8 start-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />

      <div className="relative flex items-center gap-4 sm:gap-5">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl sm:text-3xl shrink-0"
          aria-hidden="true"
        >
          👦
        </div>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="animate-pulse flex flex-col gap-2">
              <div className="h-6 w-40 max-w-full rounded-full bg-white/20" />
              <div className="h-7 w-52 max-w-full rounded-full bg-white/20" />
            </div>
          ) : (
            <>
              <p className="font-heading text-xl sm:text-2xl font-bold text-white truncate">
                {displayName}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
                  <span aria-hidden="true">⭐</span>
                  <span className="font-heading font-bold text-white text-sm">
                    {t('parentDash.level', { level: mainLevel })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
                  <span className="font-heading font-bold text-white text-sm">{tracked} / 4</span>
                  <span className="font-body text-xs text-white/80">
                    {t('parentDash.allCategories').toLowerCase()}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
