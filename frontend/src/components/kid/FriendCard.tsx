import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_STYLE, type TaskCategory } from '../../constants/categories'
import { MAIN_XP_PER_LEVEL, STAT_XP_PER_LEVEL } from '../../constants/xp'
import { type Friend } from '../../api/social'
import { useFocusOnSwap } from '../../hooks/useFocusOnSwap'

interface Props {
  friend: Friend
  onRemove: (kidId: string) => void
  disabled?: boolean
}

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']

export default function FriendCard({ friend, onRemove, disabled }: Props) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  // Activating Remove unmounts it and mounts Confirm/Cancel; without this the
  // keyboard is dropped on <body> mid-decision.
  const actionsRef = useRef<HTMLDivElement>(null)
  useFocusOnSwap(actionsRef, confirming)
  // Composed by catalog-service and passed through by social, so the
  // wardrobe a friend actually bought is included.
  const avatarUrl = friend.avatar?.avatar_url ?? null

  // All four categories, not just the ones the friend has started. A missing
  // row means zero XP, and a card that lists three categories for one friend
  // and four for another can't be read across at a glance — which is the whole
  // point of looking someone up.
  const byCategory = new Map(friend.stats.map(s => [s.category, s]))
  const overallPct = Math.min(100, (friend.overall_xp / MAIN_XP_PER_LEVEL) * 100)

  return (
    <li className="rounded-2xl bg-white p-3.5 flex flex-col gap-2.5">

      {/* ── Who ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 overflow-hidden flex items-center justify-center text-2xl shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            : <span aria-hidden="true">🧒</span>}
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
          <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-primary-50 px-2 py-0.5 font-body text-xs font-bold text-primary-700">
            <span aria-hidden="true">⭐</span>
            {t('kidDash.level', { level: friend.main_level })}
          </span>
        </div>

        {/* Presence and Remove share the header's top-right. Remove used to sit
            on its own row at the card's foot, which cost a whole block of
            height per card — with five bars already stacked, that was most of
            what made the grid feel crowded. */}
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-1.5">
          {/* A labelled pill, not a bare dot on the avatar: colour alone can't
              carry the meaning, and the label used to be sr-only so a sighted
              kid had to know what teal meant. */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-body text-xs font-semibold ${
              friend.is_online ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${friend.is_online ? 'bg-teal-500' : 'bg-gray-400'}`}
            />
            {friend.is_online ? t('friends.online') : t('friends.offline')}
          </span>

          {/* Removing a friend is quiet and permanent, so it asks first. Inline
              rather than a modal: a modal for this would be heavier than the
              act. */}
          <div ref={actionsRef} className="flex items-center gap-1">
            {confirming ? (
              <>
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
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={t('friends.removeNamed', { name: friend.name || friend.username })}
                className="min-h-11 w-11 -my-2 inline-flex items-center justify-center rounded-lg font-body text-sm text-gray-700 hover:bg-gray-100 focus-ring transition-colors"
              >
                {/* The word cost ~50px beside the presence pill and pushed it
                    to a second line. aria-label carries the meaning. */}
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Overall XP ───────────────────────────────────────────────────── */}
      {/* Label and figure on one line rather than stacked: the heading, the
          number and the bar were three rows for one fact. */}
      <div className="rounded-xl bg-gray-50 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-body text-xs text-gray-700">{t('friends.overallXp')}</p>
          <p className="font-heading text-sm font-bold text-gray-900">
            {friend.overall_xp}
            <span className="font-body text-xs font-normal text-gray-700"> / {MAIN_XP_PER_LEVEL} XP</span>
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={t('kidDash.xpProgressLabel', { next: friend.main_level + 1 })}
          aria-valuenow={friend.overall_xp}
          aria-valuemin={0}
          aria-valuemax={MAIN_XP_PER_LEVEL}
          className="relative h-2.5 mt-1.5 bg-white rounded-full overflow-hidden"
        >
          <div
            className="absolute inset-y-0 start-0 bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* ── Category XP ──────────────────────────────────────────────────── */}
      <div>
        <p className="font-body text-xs text-gray-700 mb-1">{t('friends.categoryXp')}</p>
        <ul className="flex flex-col gap-1">
          {CATEGORIES.map(category => {
            const style = CATEGORY_STYLE[category]
            const stat  = byCategory.get(category)
            const xp    = stat?.xp_percent ?? 0
            const level = stat?.level ?? 0
            const name  = t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)

            return (
              <li key={category} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-sm w-5 shrink-0">{style.icon}</span>
                <span aria-hidden="true" className="font-body text-xs text-gray-700 w-20 shrink-0 truncate">
                  {name}
                </span>
                <div
                  role="progressbar"
                  // The level is only in this label: the row shows XP within
                  // the level, so without it the number a friend is actually
                  // compared on would be missing for a screen reader.
                  aria-label={`${name} — ${t('kidDash.level', { level })}`}
                  aria-valuenow={xp}
                  aria-valuemin={0}
                  aria-valuemax={STAT_XP_PER_LEVEL}
                  className="relative h-2 flex-1 min-w-0 bg-gray-100 rounded-full overflow-hidden"
                >
                  <div
                    className={`absolute inset-y-0 start-0 ${style.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${(xp / STAT_XP_PER_LEVEL) * 100}%` }}
                  />
                </div>
                <span aria-hidden="true" className="font-body text-xs text-gray-700 w-12 text-end shrink-0 tabular-nums">
                  {xp} / {STAT_XP_PER_LEVEL}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

    </li>
  )
}
