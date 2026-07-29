import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getKidAvatar } from '../../api/catalog'
import { useKidLevel } from '../../hooks/useKidLevel'

/**
 * The dashboard's face: who you are, how far along you are, and whether you
 * kept the streak. Colour comes from the avatar and the lit streak days rather
 * than a gradient fill, so the space it takes is space that says something.
 *
 * The avatar tile is a placeholder. Character creation and the wardrobe are
 * Madiha's — when `GET /catalog/avatar/` is wired up, the composed avatar
 * image replaces the emoji here and the tile becomes a link to the wardrobe.
 */
export default function KidProgressBand() {
  const { t, i18n } = useTranslation()
  const { level, progress, xpCurrent, xpMax, coins, streak, week, isLoading } = useKidLevel()
  // Shares AvatarStudio's cache, so customising there updates this immediately.
  const { data: avatar } = useQuery({ queryKey: ['kidAvatar'], queryFn: getKidAvatar })

  const dayLetter = (date: string) => {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'narrow' })
  }
  const dayFull = (date: string) => {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' })
  }

  return (
    <section
      aria-label={t('kidDash.myStats')}
      // 700 → 600, not 600 → 500: white on primary-500 measures 4.23:1, under
      // the 4.5 AA minimum for the small XP and streak text. primary-600 is the
      // lightest shade that passes, so it is the light end of the gradient.
      // Split 2/3 + 1/3 to line up with the columns below, which also stops the
      // XP bar stretching the full width and crowding everything to the edge.
      className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-center"
    >
      {/* Who you are, and how far along */}
      <div className="lg:col-span-2 flex items-center gap-4 min-w-0">
      {/* The kid's character, and a way back to the studio that made it.
          Falls back to an emoji until the avatar loads. */}
      <Link
        to="/avatar"
        aria-label={t('kidDash.nav.avatar')}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-4xl shrink-0 overflow-hidden transition-colors focus-ring"
      >
        {avatar?.avatar_url
          ? <img src={avatar.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span aria-hidden="true">🧒</span>}
      </Link>

      {/* Level + XP. Capped: stretched across the full column the bar reads as
          empty space rather than progress. */}
      <div className="flex-1 min-w-0 max-w-md">
        {isLoading ? (
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-4 w-28 rounded-full bg-white/25" />
            <div className="h-3 rounded-full bg-white/25" />
          </div>
        ) : (
          <>
            {/* Kept together: the count describes the level, so stranding it at
                the far end of a long bar breaks the association. */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-heading font-bold text-white">
                <span aria-hidden="true" className="me-1.5">⭐</span>{t('kidDash.level', { level })}
              </span>
              <span className="font-body text-xs text-white">{xpCurrent} / {xpMax} XP</span>
            </div>
            <div
              role="progressbar"
              aria-label={t('kidDash.xpProgressLabel', { next: level + 1 })}
              aria-valuenow={xpCurrent}
              aria-valuemin={0}
              aria-valuemax={xpMax}
              className="h-3 bg-white/25 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>

      </div>

      {/* What you've banked: coins to spend, and the week behind you. */}
      {!isLoading && (
        <div className="flex items-center justify-start lg:justify-end gap-3 sm:gap-4 flex-wrap min-w-0">

          {/* Shown even at zero — the topbar hides coins below 1, so a kid who
              has never earned any had no way to know the currency exists.
              Links to the shop, since that is the only thing they are for. */}
          <Link
            to="/avatar"
            aria-label={`${coins} ${t('kidDash.coins')}`}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-2 transition-colors focus-ring"
          >
            <span className="text-lg" aria-hidden="true">🪙</span>
            <span aria-hidden="true">
              <span className="block font-heading font-bold text-white text-base leading-none">{coins}</span>
              <span className="block font-body text-[10px] text-white leading-none mt-0.5">{t('kidDash.coins')}</span>
            </span>
          </Link>

          {/* The week made visible, so a gap is something you can see. Label
              sits above the tiles so this block mirrors the coin chip beside
              it — count on top, detail underneath. */}
          <div className="shrink-0">
          <p className="font-body text-xs text-white mb-1.5">
            <span aria-hidden="true">🔥</span> {t('kidDash.streakLabel', { count: streak })}
          </p>
          <ul
            className="flex gap-1"
            aria-label={t('kidDash.streakLabel', { count: streak })}
          >
            {week.map(day => (
              <li
                key={day.date}
                title={dayFull(day.date)}
                // Missed days stay legible rather than ghosted — the letter is
                // the only thing telling a sighted kid which day it was.
                className={`w-6 h-8 sm:w-7 sm:h-9 rounded-lg flex items-center justify-center font-body text-xs font-bold shrink-0 ${
                  day.done ? 'bg-white/25 text-white' : 'bg-white/10 text-white'
                } ${day.isToday ? 'ring-2 ring-white ring-offset-2 ring-offset-primary-600' : ''}`}
              >
                <span aria-hidden="true">{day.done ? '🔥' : dayLetter(day.date)}</span>
                <span className="sr-only">
                  {dayFull(day.date)}
                  {day.done ? ` — ${t('kidDash.statusConfirmed')}` : ''}
                </span>
              </li>
            ))}
          </ul>
          </div>
        </div>
      )}
    </section>
  )
}
