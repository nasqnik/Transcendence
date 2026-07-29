import { useTranslation } from 'react-i18next'
import Avatar from './Avatar'

interface KidCardProps {
  kidName?: string
  avatarUrl?: string
}

/** Compact identity header for the selected kid (real avatar, or initial fallback). */
export default function KidCard({ kidName, avatarUrl }: KidCardProps) {
  const { t } = useTranslation()
  const displayName = kidName || t('parentDash.yourChild')

  return (
    <div className="flex items-center gap-3">
      <Avatar
        src={avatarUrl}
        name={displayName}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary-50"
        textClassName="text-xl sm:text-2xl"
      />
      <p className="font-heading text-xl sm:text-2xl font-bold text-gray-900 truncate">
        {displayName}
      </p>
    </div>
  )
}
