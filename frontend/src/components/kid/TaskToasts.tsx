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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-400 text-white font-heading font-bold text-lg px-6 py-3 rounded-2xl shadow-lg pointer-events-none select-none"
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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-danger-700 text-white font-body font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg pointer-events-none select-none"
        >
          <span aria-hidden="true">⚠️</span>
          {t('errors.generic')}
        </div>
      )}
    </>
  )
}
