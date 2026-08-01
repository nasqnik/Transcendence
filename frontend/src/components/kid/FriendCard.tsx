import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_STYLE, type TaskCategory } from '../../constants/categories'
import { friendAvatarUrl, type Friend } from '../../api/social'
import { useFocusOnSwap } from '../../hooks/useFocusOnSwap'

interface Props {
  friend: Friend
  onRemove: (kidId: string) => void
  disabled?: boolean
}

export default function FriendCard({ friend, onRemove, disabled }: Props) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  // Activating Remove unmounts it and mounts Confirm/Cancel; without this the
  // keyboard is dropped on <body> mid-decision.
  const actionsRef = useRef<HTMLDivElement>(null)
  useFocusOnSwap(actionsRef, confirming)
  const avatarUrl = friendAvatarUrl(friend.avatar)

  return (
    <li className="rounded-2xl bg-gray-50 p-3">
      <div className="flex items-start gap-3">

      {/* Character + presence. The dot sits on the avatar rather than next to
          the name so the whole card reads as "this person, right now". */}
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-white overflow-hidden flex items-center justify-center text-2xl">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            : <span aria-hidden="true">🧒</span>}
        </div>
        <span
          // Ring in the card's own colour so the dot reads as a separate object
          // rather than a smudge on the avatar's edge.
          className={`absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full ring-2 ring-gray-50 ${
            friend.is_online ? 'bg-teal-500' : 'bg-gray-300'
          }`}
        >
          <span className="sr-only">
            {friend.is_online ? t('friends.online') : t('friends.offline')}
          </span>
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-heading font-bold text-gray-900 truncate">
          {friend.name || friend.username}
        </p>
        {/* bdi, because a Latin username inside an Arabic page gets reordered
            by the bidi algorithm and "@yusuf" renders as "yusuf@". */}
        <p className="font-body text-xs text-gray-700 truncate">
          <bdi>@{friend.username}</bdi>
        </p>

        <p className="font-body text-xs text-gray-700 mt-1">
          <span aria-hidden="true" className="me-1.5">⭐</span>{t('kidDash.level', { level: friend.main_level })}
        </p>
      </div>

      {/* Removing a friend is quiet and permanent, so it asks first. Inline
          rather than a modal: a modal for this would be heavier than the act. */}
      <div className="shrink-0" ref={actionsRef}>
        {confirming ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => { setConfirming(false); onRemove(friend.kid_id) }}
              className="min-h-11 px-2.5 rounded-lg bg-danger-50 font-body text-xs font-bold text-danger-700 hover:bg-danger-100 disabled:opacity-50 focus-ring transition-colors"
            >
              {t('friends.removeConfirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 px-2.5 rounded-lg font-body text-xs font-semibold text-gray-700 hover:bg-gray-100 focus-ring transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={t('friends.removeNamed', { name: friend.name || friend.username })}
            className="min-h-11 px-2.5 rounded-lg font-body text-xs font-semibold text-gray-700 hover:bg-gray-100 focus-ring transition-colors"
          >
            {/* Narrow screens can't spare ~50px for a word here: with the
                label spelled out, every friend's name truncated to "Yusuf
                Ha…". The aria-label carries the meaning either way. */}
            <span className="hidden sm:inline">{t('friends.remove')}</span>
            <span className="sm:hidden text-sm" aria-hidden="true">✕</span>
          </button>
        )}
      </div>
      </div>

      {/* Category levels span the whole card, not the name column. Nested in
          the middle column they had roughly 85px on a phone and stacked into
          a four-storey tower. Seeing a friend ahead of you in a category is
          the whole reason to look someone up, so they need to read as a row. */}
      {friend.stats.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-2.5">
          {friend.stats.map(stat => {
            const style = CATEGORY_STYLE[stat.category as TaskCategory]
            if (!style) return null
            return (
              <li
                key={stat.category}
                className={`${style.bg} rounded-lg px-2 py-1 font-body text-xs font-bold ${style.text}`}
              >
                <span aria-hidden="true">{style.icon} {stat.level}</span>
                <span className="sr-only">
                  {t(`kidDash.categories.${stat.category}` as `kidDash.categories.${TaskCategory}`)}
                  {' — '}
                  {t('kidDash.level', { level: stat.level })}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
