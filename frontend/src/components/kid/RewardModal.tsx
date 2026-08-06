import { useTranslation } from 'react-i18next'
import Modal from '../Modal'
import { CATEGORY_STYLE, type StatCategory } from '../../constants/categories'
import { type RewardSummary } from '../../api/gamification'
import { useCountUp } from '../../hooks/useCountUp'

interface Props {
  reward: RewardSummary
  /** How many more awards are queued behind this one. */
  remaining: number
  onClose: () => void
}

/**
 * One coin award, celebrated.
 *
 * This replaces the old level-up modal rather than sitting beside it: the
 * server grants coins at the exact moment a category bar fills, so a coin popup
 * and a level-up popup would be two dialogs fighting over one event. The coins
 * lead because they were the part a kid never saw — the balance in the topbar
 * just changed on its own.
 */
export default function RewardModal({ reward, remaining, onClose }: Props) {
  const { t } = useTranslation()
  const coins = useCountUp(reward.coins_awarded)

  // A single award can raise two categories at once when a task feeds both.
  const levelUps = reward.stat_level_ups

  return (
    <Modal
      onClose={onClose}
      labelledBy="reward-title"
      describedBy="reward-total"
      role="alertdialog"
      cardClassName="rounded-3xl w-full max-w-xs mx-4 p-8 flex flex-col items-center gap-4 text-center"
    >
      {/* The coin, bouncing once. `motion-safe:` so a kid who asked their
          system for less movement gets a still icon instead. */}
      <div
        aria-hidden="true"
        className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center text-4xl motion-safe:animate-bounce"
      >
        🪙
      </div>

      <div>
        <p id="reward-title" className="font-heading text-2xl font-bold text-gray-900">
          {/* The number counts up, but the accessible name states the final
              figure once — a live region ticking through 12 values would be
              read out as noise. */}
          <span aria-hidden="true">+{coins}</span>
          <span className="sr-only">{t('reward.coinsEarned', { coins: reward.coins_awarded })}</span>
          {' '}
          <span className="font-body text-base font-semibold text-amber-700">
            {t('kidDash.coins')}
          </span>
        </p>
        <p id="reward-total" className="font-body text-sm text-gray-700 mt-1">
          {t('reward.newTotal', { total: reward.coins_total })}
        </p>
      </div>

      {levelUps.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-1.5">
          {levelUps.map(up => {
            const style = CATEGORY_STYLE[up.category as StatCategory]
            if (!style) return null
            const label = t(`kidDash.categories.${up.category}` as `kidDash.categories.${StatCategory}`)
            return (
              <li
                key={up.category}
                className={`${style.bg} ${style.text} rounded-full px-3 py-1 font-body text-xs font-bold`}
              >
                <span aria-hidden="true">{style.icon} </span>
                {t('reward.levelChip', { level: up.level, category: label })}
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onClose}
        // primary-600, not amber-700. Amber is the coin colour and passes
        // contrast easily (10.01:1), but as a full-width fill it renders brown
        // and reads sombre — wrong for the one screen that exists to celebrate.
        // This is the same purple every other primary action uses, at 5.70:1.
        className="mt-2 w-full min-h-11 py-3 rounded-xl bg-primary-600 font-body font-semibold text-sm text-white hover:bg-primary-700 focus-ring transition-colors"
      >
        <span aria-hidden="true">🚀</span>{' '}
        {/* When more awards are queued, say so — otherwise dismissing one and
            being handed another looks like the dialog failed to close. */}
        {remaining > 0 ? t('reward.next') : t('kidDash.letsGo')}
      </button>
    </Modal>
  )
}
