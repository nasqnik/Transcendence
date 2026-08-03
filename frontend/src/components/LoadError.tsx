import { useTranslation } from 'react-i18next'

interface Props {
  /** Re-runs the failed query. */
  onRetry: () => void
  /** `inline` for a slot inside a card, `block` for a whole empty panel. */
  variant?: 'inline' | 'block'
}

/**
 * "Couldn't load this" — shown where a failed fetch would otherwise fall
 * through to an empty state.
 *
 * Without this, a dropped connection is indistinguishable from having no data:
 * the tasks card says "No tasks for today", the friends list says "No friends
 * yet", and the stats panel reads as all zeros. Each of those is a confident
 * claim about the kid's life, made on the strength of a request that failed.
 */
export default function LoadError({ onRetry, variant = 'block' }: Props) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-2 text-center ${variant === 'block' ? 'py-10' : 'py-4'}`}
    >
      <span className="text-4xl" aria-hidden="true">🔌</span>
      <p className="font-heading font-bold text-gray-900">{t('common.loadFailed')}</p>
      <p className="font-body text-sm text-gray-700">{t('common.loadFailedHint')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-xl bg-primary-600 px-4 py-2 font-body text-sm font-bold text-white hover:bg-primary-700 focus-ring transition-colors"
      >
        {t('common.retry')}
      </button>
    </div>
  )
}
