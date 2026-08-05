import { useTranslation } from 'react-i18next'

interface Props {
  /** XP just earned, or null when the toast is hidden. */
  xp: number | null
  error: boolean
}

/** Bottom-centred feedback for completing a task. */
export default function TaskToasts({ xp, error }: Props) {
  const { t } = useTranslation()

  return (
    <>
      {xp !== null && (
        <div
          role="status"
          aria-live="polite"
          // Raised above the mobile tab bar (56px + safe-area) — at bottom-8 the
          // toast sat on top of the tabs. Desktop has no bar, so it drops back.
          // amber-700 on amber-500, not white on amber-400. Two problems there:
          // amber-400 is not in this theme at all, so it fell through to
          // Tailwind's default ramp and bypassed the documented palette; and
          // white on it measured 1.67:1, far under the 4.5 AA floor. This pair
          // is 4.60:1 and keeps the gold the celebration wants.
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-500 text-amber-700 font-heading font-bold text-lg px-6 py-3 rounded-2xl shadow-lg pointer-events-none select-none"
        >
          <span aria-hidden="true">⭐</span>
          +{xp} XP
          <span className="sr-only">{t('kidDash.xpEarned', { xp })}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          // `left-1/2 -translate-x-1/2` stays physical on purpose: it centres,
          // and centring is symmetric. `start-1/2` would flip the anchor in RTL
          // while the translate did not, pushing the toast off-centre.
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-danger-700 text-white font-body font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg pointer-events-none select-none"
        >
          <span aria-hidden="true">⚠️</span>
          {t('errors.generic')}
        </div>
      )}
    </>
  )
}
