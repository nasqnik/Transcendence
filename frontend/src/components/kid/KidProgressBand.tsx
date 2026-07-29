import { useTranslation } from 'react-i18next'
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
  const { level, progress, xpCurrent, xpMax, streak, week, isLoading } = useKidLevel()

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
      className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap"
    >
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0"
        aria-hidden="true"
      >
        🧒
      </div>

      {/* Level + XP */}
      <div className="flex-1 min-w-[12rem]">
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
                <span aria-hidden="true">⭐</span> {t('kidDash.level', { level })}
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

      {/* Streak — the week made visible, so a gap is something you can see */}
      {!isLoading && (
        <div className="shrink-0">
          <p className="font-body text-xs text-white mb-1.5 text-center sm:text-start">
            <span aria-hidden="true">🔥</span> {t('kidDash.streakLabel', { count: streak })}
          </p>
          <ul className="flex gap-1" aria-label={t('kidDash.streakLabel', { count: streak })}>
            {week.map(day => (
              <li
                key={day.date}
                title={dayFull(day.date)}
                // Missed days stay legible rather than ghosted — the letter is
                // the only thing telling a sighted kid which day it was.
                className={`w-7 h-8 rounded-lg flex items-center justify-center font-body text-xs font-bold ${
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
      )}
    </section>
  )
}
