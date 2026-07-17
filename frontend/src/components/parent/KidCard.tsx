import { useTranslation } from 'react-i18next'

interface KidCardProps {
  kidName?: string
}

/** Compact identity header for the selected kid (avatar placeholder + name).
 *  The circle becomes the kid's real avatar once the backend exposes it. */
export default function KidCard({ kidName }: KidCardProps) {
  const { t } = useTranslation()
  const displayName = kidName || t('parentDash.yourChild')

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-xl sm:text-2xl shrink-0"
        aria-hidden="true"
      >
        👦
      </div>
      <p className="font-heading text-xl sm:text-2xl font-bold text-gray-900 truncate">
        {displayName}
      </p>
    </div>
  )
}
